from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.runtime_env import load_runtime_env  # noqa: E402
from app.services.rag import LIB_PATH, build_embedding_records  # noqa: E402

load_runtime_env()

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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Embed viral library records and upsert them into Pinecone.")
    parser.add_argument("--namespace", default=os.getenv("PINECONE_NAMESPACE", "viral-library"))
    parser.add_argument("--index-host", default=os.getenv("PINECONE_INDEX_HOST", ""))
    parser.add_argument("--index-name", default=os.getenv("PINECONE_INDEX_NAME", ""))
    parser.add_argument("--embedding-model", default=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"))
    parser.add_argument("--batch-size", type=int, default=50)
    return parser.parse_args()


def get_openai_client() -> Any:
    if OpenAI is None:
        raise RuntimeError("OPENAI_SDK_MISSING")

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY_MISSING")

    kwargs: dict[str, Any] = {"api_key": api_key, "max_retries": 0}
    base_url = os.getenv("OPENAI_BASE_URL", "").strip()
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)


def get_index(index_host: str, index_name: str) -> Any:
    if Pinecone is None:
        raise RuntimeError("PINECONE_SDK_MISSING")

    api_key = os.getenv("PINECONE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("PINECONE_API_KEY_MISSING")

    pc = Pinecone(api_key=api_key)
    host = index_host.strip()

    if not host:
        if not index_name.strip():
            raise RuntimeError("PINECONE_INDEX_CONFIG_MISSING")
        described = pc.describe_index(name=index_name.strip())
        host = getattr(described, "host", None) or (described.get("host") if isinstance(described, dict) else None) or ""

    if not host:
        raise RuntimeError("PINECONE_INDEX_HOST_MISSING")

    return pc.Index(host=host)


def batched(items: list[dict[str, Any]], batch_size: int) -> list[list[dict[str, Any]]]:
    return [items[i : i + batch_size] for i in range(0, len(items), batch_size)]


def embed_records(client: Any, model: str, records: list[dict[str, Any]]) -> list[list[float]]:
    response = client.embeddings.create(
        model=model,
        input=[record["content"] for record in records],
        encoding_format="float",
    )
    return [item.embedding for item in response.data]


def main() -> None:
    args = parse_args()
    library = json.loads(LIB_PATH.read_text(encoding="utf-8"))
    records = build_embedding_records(library)
    if not records:
        raise RuntimeError(f"No records found in {LIB_PATH}")

    client = get_openai_client()
    index = get_index(args.index_host, args.index_name)

    total_upserted = 0
    for batch in batched(records, max(1, args.batch_size)):
        embeddings = embed_records(client, args.embedding_model, batch)
        vectors = []
        for record, embedding in zip(batch, embeddings, strict=True):
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

        index.upsert(vectors=vectors, namespace=args.namespace)
        total_upserted += len(vectors)
        print(f"Upserted batch: {len(vectors)} records into namespace={args.namespace}")

    print(f"Done. Upserted {total_upserted} total records into namespace={args.namespace} using model={args.embedding_model}")


if __name__ == "__main__":
    main()
