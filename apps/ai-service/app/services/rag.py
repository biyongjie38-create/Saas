from __future__ import annotations

import json
import os
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.schemas import RagCompareRequest
from app.services.provider import ModelExecution, get_provider_mode

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

try:
    from pinecone.grpc import PineconeGRPC as Pinecone
except Exception:
    try:
        from pinecone import Pinecone
    except Exception:
        Pinecone = None

LIB_PATH = Path(__file__).resolve().parents[1] / "data" / "viral_library.json"

TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    "education": ("tutorial", "education", "learn", "teaching", "course", "explainer"),
    "productivity": ("product", "workflow", "system", "template", "productivity", "tool"),
    "vlog": ("vlog", "lifestyle", "daily", "creator"),
    "essay": ("essay", "story", "narrative", "documentary", "breakdown"),
}

HOOK_KEYWORDS: dict[str, tuple[str, ...]] = {
    "result-first": ("outcome", "result", "final", "comeback", "before/after"),
    "contrast": ("contrast", "before", "after", "versus", "vs"),
    "emotion-spike": ("emotion", "emotional", "shock", "tension", "spike"),
    "question-loop": ("question", "mystery", "loop", "why", "what happened"),
}


def build_rag_provider_overrides(
    *,
    llm_provider: str | None = None,
    openai_api_key: str | None = None,
    openai_base_url: str | None = None,
    embedding_model: str | None = None,
    pinecone_api_key: str | None = None,
    pinecone_index_host: str | None = None,
    pinecone_index_name: str | None = None,
    pinecone_namespace: str | None = None,
) -> dict[str, str] | None:
    payload = {
        "llm_provider": (llm_provider or "").strip(),
        "openai_api_key": (openai_api_key or "").strip(),
        "openai_base_url": (openai_base_url or "").strip(),
        "embedding_model": (embedding_model or "").strip(),
        "pinecone_api_key": (pinecone_api_key or "").strip(),
        "pinecone_index_host": (pinecone_index_host or "").strip(),
        "pinecone_index_name": (pinecone_index_name or "").strip(),
        "pinecone_namespace": (pinecone_namespace or "").strip(),
    }
    return payload if any(payload.values()) else None


def _tokenize(text: str) -> set[str]:
    pieces = text.lower().replace("/", " ").replace("-", " ").split()
    return {piece.strip() for piece in pieces if piece.strip()}


def _similarity(left: str, right: str) -> int:
    a = _tokenize(left)
    b = _tokenize(right)

    if not a or not b:
        return 60

    overlap = len(a.intersection(b))
    score = int(60 + (overlap / max(len(a), 1)) * 40)
    return min(98, max(60, score))


def _load_library() -> list[dict[str, Any]]:
    if not LIB_PATH.exists():
        return []
    return json.loads(LIB_PATH.read_text(encoding="utf-8"))


def _coerce_tags(item: dict[str, Any]) -> dict[str, str]:
    tags = item.get("tags") or {}
    return {
        "hook_type": str(tags.get("hook_type") or tags.get("hookType") or "unknown"),
        "topic": str(tags.get("topic") or "general"),
        "duration_bucket": str(tags.get("duration_bucket") or tags.get("durationBucket") or "unknown"),
    }


def _compose_document(item: dict[str, Any]) -> str:
    tags = _coerce_tags(item)
    return "\n".join(
        [
            f"title: {item.get('title', '')}",
            f"summary: {item.get('summary', '')}",
            f"topic: {tags['topic']}",
            f"hook_type: {tags['hook_type']}",
            f"duration_bucket: {tags['duration_bucket']}",
        ]
    )


def _infer_label(text: str, rules: dict[str, tuple[str, ...]]) -> str | None:
    lowered = text.lower()
    best_label: str | None = None
    best_score = 0

    for label, keywords in rules.items():
        score = sum(1 for keyword in keywords if keyword in lowered)
        if score > best_score:
            best_score = score
            best_label = label

    return best_label if best_score > 0 else None


def _build_filter(data: RagCompareRequest) -> dict[str, Any] | None:
    merged_text = f"{data.topic_hint} {data.structure_summary}"
    topic = _infer_label(merged_text, TOPIC_KEYWORDS)
    hook_type = _infer_label(merged_text, HOOK_KEYWORDS)

    clauses: list[dict[str, Any]] = []
    if topic:
        clauses.append({"topic": {"$eq": topic}})
    if hook_type:
        clauses.append({"hook_type": {"$eq": hook_type}})

    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def _match_value(match: Any, key: str, default: Any = None) -> Any:
    if isinstance(match, dict):
        return match.get(key, default)
    return getattr(match, key, default)


def _normalize_similarity(score: Any) -> int:
    try:
        value = float(score)
    except Exception:
        return 0

    if value <= 1.0:
        value *= 100

    return max(0, min(100, int(round(value))))


def _build_match_payload(match: Any, query_text: str) -> dict[str, Any]:
    metadata = _match_value(match, "metadata", {}) or {}
    title = str(metadata.get("title") or _match_value(match, "id", "Unknown"))
    topic = str(metadata.get("topic") or "general")
    hook_type = str(metadata.get("hook_type") or "unknown")
    duration_bucket = str(metadata.get("duration_bucket") or "unknown")

    return {
        "id": str(_match_value(match, "id", title)),
        "title": title,
        "source_url": str(metadata.get("source_url") or metadata.get("url") or "https://youtube.com"),
        "similarity": _normalize_similarity(_match_value(match, "score", 0)),
        "shared_points": [
            f"Relevant to topic cluster: {topic}",
            f"Retrieved with hook pattern: {hook_type}",
        ],
        "differences": [
            f"Benchmark duration bucket is {duration_bucket}, so pacing may differ from the current video."
        ],
        "copy": [
            f"Adapt the {hook_type} opening pattern into the first 10-15 seconds.",
            f"Reuse the {topic} framing from this benchmark while keeping your original promise specific.",
        ],
        "avoid": [
            "Avoid generic intro context before the main payoff.",
            f"Avoid drifting away from the query focus: {query_text[:80]}",
        ],
    }


def _fallback_payload(data: RagCompareRequest) -> dict[str, Any]:
    library = _load_library()
    ranked = sorted(
        library,
        key=lambda item: _similarity(
            f"{data.structure_summary} {data.topic_hint}",
            f"{item.get('title', '')} {item.get('summary', '')}",
        ),
        reverse=True,
    )

    top_matches = []
    for item in ranked[: data.top_k]:
        similarity = _similarity(
            f"{data.structure_summary} {data.topic_hint}",
            f"{item.get('title', '')} {item.get('summary', '')}",
        )
        tags = _coerce_tags(item)

        top_matches.append(
            {
                "id": item["id"],
                "title": item["title"],
                "source_url": item.get("source_url") or item.get("sourceUrl") or "https://youtube.com",
                "similarity": similarity,
                "shared_points": [
                    f"Topic alignment: {tags['topic']}",
                    f"Hook pattern overlap: {tags['hook_type']}",
                ],
                "differences": [
                    f"This benchmark sits in the {tags['duration_bucket']} runtime bucket."
                ],
                "copy": [
                    f"Borrow the {tags['hook_type']} opening pattern.",
                    "Pull one concrete benchmark beat into the first third of the script.",
                ],
                "avoid": ["Avoid long intro setup", "Avoid late CTA placement"],
            }
        )

    return {"top_matches": top_matches}


def build_benchmark_payload(data: RagCompareRequest) -> dict[str, Any]:
    return _fallback_payload(data)


@lru_cache(maxsize=1)
def _get_openai_client() -> Any:
    if OpenAI is None:
        raise RuntimeError("OPENAI_SDK_MISSING")

    kwargs: dict[str, Any] = {
        "api_key": os.getenv("OPENAI_API_KEY"),
        "max_retries": 0,
    }
    base_url = os.getenv("OPENAI_BASE_URL")
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)


def _create_openai_client(provider_overrides: dict[str, str] | None = None) -> Any:
    if OpenAI is None:
        raise RuntimeError("OPENAI_SDK_MISSING")

    if not provider_overrides or not (
        provider_overrides.get("openai_api_key") or provider_overrides.get("openai_base_url")
    ):
        return _get_openai_client()

    kwargs: dict[str, Any] = {
        "api_key": provider_overrides.get("openai_api_key") or os.getenv("OPENAI_API_KEY"),
        "max_retries": 0,
    }
    base_url = provider_overrides.get("openai_base_url") or os.getenv("OPENAI_BASE_URL")
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)


def _get_host_from_description(described: Any) -> str | None:
    if isinstance(described, dict):
        return described.get("host")
    return getattr(described, "host", None)


@lru_cache(maxsize=1)
def _get_pinecone_index() -> Any:
    if Pinecone is None:
        raise RuntimeError("PINECONE_SDK_MISSING")

    api_key = os.getenv("PINECONE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("PINECONE_API_KEY_MISSING")

    host = os.getenv("PINECONE_INDEX_HOST", "").strip()
    index_name = os.getenv("PINECONE_INDEX_NAME", "").strip()

    pc = Pinecone(api_key=api_key)

    if not host:
        if not index_name:
            raise RuntimeError("PINECONE_INDEX_CONFIG_MISSING")
        described = pc.describe_index(name=index_name)
        host = _get_host_from_description(described) or ""

    if not host:
        raise RuntimeError("PINECONE_INDEX_HOST_MISSING")

    return pc.Index(host=host)


def _create_pinecone_index(provider_overrides: dict[str, str] | None = None) -> Any:
    if not provider_overrides or not (
        provider_overrides.get("pinecone_api_key")
        or provider_overrides.get("pinecone_index_host")
        or provider_overrides.get("pinecone_index_name")
    ):
        return _get_pinecone_index()

    if Pinecone is None:
        raise RuntimeError("PINECONE_SDK_MISSING")

    api_key = provider_overrides.get("pinecone_api_key") or os.getenv("PINECONE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("PINECONE_API_KEY_MISSING")

    host = provider_overrides.get("pinecone_index_host") or os.getenv("PINECONE_INDEX_HOST", "").strip()
    index_name = provider_overrides.get("pinecone_index_name") or os.getenv("PINECONE_INDEX_NAME", "").strip()

    pc = Pinecone(api_key=api_key)

    if not host:
        if not index_name:
            raise RuntimeError("PINECONE_INDEX_CONFIG_MISSING")
        described = pc.describe_index(name=index_name)
        host = _get_host_from_description(described) or ""

    if not host:
        raise RuntimeError("PINECONE_INDEX_HOST_MISSING")

    return pc.Index(host=host)


def _embed_query(text: str, provider_overrides: dict[str, str] | None = None) -> tuple[list[float], str, int, int, int, str | None]:
    client = _create_openai_client(provider_overrides)
    model = (provider_overrides.get("embedding_model") if provider_overrides else "") or os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small").strip() or "text-embedding-3-small"
    response = client.embeddings.create(
        model=model,
        input=[text],
        encoding_format="float",
    )
    usage = getattr(response, "usage", None)
    prompt_tokens = int(getattr(usage, "prompt_tokens", 0) or 0)
    total_tokens = int(getattr(usage, "total_tokens", prompt_tokens) or prompt_tokens)
    provider_request_id = getattr(response, "_request_id", None)
    return response.data[0].embedding, model, prompt_tokens, 0, total_tokens, provider_request_id


def _embed_documents(texts: list[str], provider_overrides: dict[str, str] | None = None) -> tuple[list[list[float]], str]:
    client = _create_openai_client(provider_overrides)
    model = (
        (provider_overrides.get("embedding_model") if provider_overrides else "")
        or os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small").strip()
        or "text-embedding-3-small"
    )
    response = client.embeddings.create(
        model=model,
        input=texts,
        encoding_format="float",
    )
    return [item.embedding for item in response.data], model


def _resolve_namespace(provider_overrides: dict[str, str] | None = None) -> str:
    return (
        provider_overrides.get("pinecone_namespace")
        if provider_overrides and provider_overrides.get("pinecone_namespace")
        else os.getenv("PINECONE_NAMESPACE", "viral-library")
    )


def _build_local_execution(mode: str, data: RagCompareRequest, started: float) -> ModelExecution:
    return ModelExecution(
        payload=build_benchmark_payload(data),
        model="local-rag-similarity-v1",
        provider="local",
        fallback_used=mode != "local",
        retries=0,
        latency_ms=int((time.perf_counter() - started) * 1000),
        input_tokens=0,
        output_tokens=0,
        total_tokens=0,
        provider_request_id=None,
    )


def run_benchmark_retrieval(
    data: RagCompareRequest,
    top_k: int,
    provider_overrides: dict[str, str] | None = None,
) -> ModelExecution:
    started = time.perf_counter()
    mode = get_provider_mode()
    resolved_top_k = max(1, int(top_k or data.top_k or 3))

    if mode == "local":
        return _build_local_execution(mode, data, started)

    query_text = f"{data.structure_summary}\nTopic hint: {data.topic_hint}".strip()
    filter_expression = _build_filter(data)

    try:
        vector, embedding_model, input_tokens, output_tokens, total_tokens, provider_request_id = _embed_query(
            query_text,
            provider_overrides,
        )
        index = _create_pinecone_index(provider_overrides)

        kwargs: dict[str, Any] = {
            "namespace": _resolve_namespace(provider_overrides),
            "vector": vector,
            "top_k": resolved_top_k,
            "include_metadata": True,
        }
        if filter_expression:
            kwargs["filter"] = filter_expression

        response = index.query(**kwargs)
        matches = _match_value(response, "matches", []) or []

        if not matches and filter_expression:
            fallback_kwargs = dict(kwargs)
            fallback_kwargs.pop("filter", None)
            response = index.query(**fallback_kwargs)
            matches = _match_value(response, "matches", []) or []

        payload = {
            "top_matches": [_build_match_payload(match, query_text) for match in list(matches)[:resolved_top_k]]
        }

        return ModelExecution(
            payload=payload,
            model=f"{embedding_model} -> pinecone",
            provider=f"{(provider_overrides.get('llm_provider') if provider_overrides and provider_overrides.get('llm_provider') else 'openai')}+pinecone",
            fallback_used=False,
            retries=0,
            latency_ms=int((time.perf_counter() - started) * 1000),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            provider_request_id=provider_request_id,
        )
    except Exception as exc:
        print(f"[ai-service][rag] Pinecone retrieval failed, falling back to local similarity: {exc}")
        return _build_local_execution(mode, data, started)


def build_embedding_records(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for item in items:
        tags = _coerce_tags(item)
        records.append(
            {
                "id": str(item.get("id")),
                "content": _compose_document(item),
                "title": str(item.get("title") or ""),
                "summary": str(item.get("summary") or ""),
                "source_url": str(item.get("source_url") or item.get("sourceUrl") or ""),
                "topic": tags["topic"],
                "hook_type": tags["hook_type"],
                "duration_bucket": tags["duration_bucket"],
            }
        )
    return records


def upsert_library_index(items: list[dict[str, Any]], provider_overrides: dict[str, str] | None = None) -> dict[str, Any]:
    records = build_embedding_records(items)
    if not records:
        return {"upserted": 0, "namespace": _resolve_namespace(provider_overrides), "model": "none", "provider": "noop"}

    embeddings, model = _embed_documents([record["content"] for record in records], provider_overrides)
    index = _create_pinecone_index(provider_overrides)
    namespace = _resolve_namespace(provider_overrides)

    vectors = []
    for record, embedding in zip(records, embeddings, strict=True):
        vectors.append(
            {
                "id": record["id"],
                "values": embedding,
                "metadata": {
                    "title": record["title"],
                    "summary": record["summary"],
                    "source_url": record["source_url"],
                    "topic": record["topic"],
                    "hook_type": record["hook_type"],
                    "duration_bucket": record["duration_bucket"],
                },
            }
        )

    index.upsert(vectors=vectors, namespace=namespace)

    return {
        "upserted": len(vectors),
        "namespace": namespace,
        "model": model,
        "provider": f"{(provider_overrides.get('llm_provider') if provider_overrides and provider_overrides.get('llm_provider') else 'openai')}+pinecone",
    }


def delete_library_index(ids: list[str], provider_overrides: dict[str, str] | None = None) -> dict[str, Any]:
    namespace = _resolve_namespace(provider_overrides)
    resolved_ids = [item for item in ids if item]
    if not resolved_ids:
        return {"deleted": 0, "namespace": namespace, "provider": "noop"}

    index = _create_pinecone_index(provider_overrides)
    index.delete(ids=resolved_ids, namespace=namespace)
    return {
        "deleted": len(resolved_ids),
        "namespace": namespace,
        "provider": f"{(provider_overrides.get('llm_provider') if provider_overrides and provider_overrides.get('llm_provider') else 'openai')}+pinecone",
    }


