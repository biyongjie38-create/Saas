from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException

from app.monitoring import init_sentry
from app.runtime_env import load_runtime_env
from app.schemas import (
    AnalysisPayload,
    AnalyzeRequest,
    AnalyzeResponse,
    BenchmarksPayload,
    RagDeleteRequest,
    RagDeleteResponse,
    RagCompareRequest,
    RagCompareResponse,
    RagIndexRequest,
    RagIndexResponse,
    ScorePayload,
    ScoreRequest,
    ScoreResponse,
)
from app.services.analysis import (
    build_analysis_payload,
    build_analysis_user_content,
    build_analysis_system_prompt,
    build_analysis_user_prompt,
)
from app.services.model_router import route_analysis_model, route_score_model
from app.services.provider import build_provider_overrides, get_billing_mode, run_json_task
from app.services.rag import (
    build_rag_provider_overrides,
    delete_library_index,
    run_benchmark_retrieval,
    upsert_library_index,
)
from app.services.scoring import (
    build_score_payload,
    build_score_system_prompt,
    build_score_user_prompt,
)

load_runtime_env()
init_sentry()

app = FastAPI(title="ViralBrain AI Service", version="0.4.0")

SERVICE_RUNTIME_ERRORS = {
    "AI_PROVIDER_LOCAL_MODE_DISABLED",
    "AI_PROVIDER_CREDENTIALS_MISSING",
    "AI_PROVIDER_REQUEST_FAILED",
    "AI_PROVIDER_REQUEST_TIMEOUT",
    "RAG_PROVIDER_CREDENTIALS_MISSING",
    "RAG_PROVIDER_REQUEST_FAILED",
}


def raise_service_error(error: Exception) -> None:
    message = str(error).strip() or "AI_SERVICE_FAILED"
    if message in SERVICE_RUNTIME_ERRORS:
        raise HTTPException(status_code=503, detail=message) from error
    raise error


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "service": "ai-service",
        "billing_mode": get_billing_mode(),
        "provider_mode": (os.getenv("AI_PROVIDER") or "auto").strip() or "auto",
        "sentry_enabled": bool((os.getenv("SENTRY_DSN") or "").strip()),
        "pinecone_configured": bool(
            (os.getenv("PINECONE_API_KEY") or "").strip()
            and (
                (os.getenv("PINECONE_INDEX_HOST") or "").strip()
                or (os.getenv("PINECONE_INDEX_NAME") or "").strip()
            )
        ),
    }


@app.post("/ai/analyze", response_model=AnalyzeResponse)
def analyze(
    data: AnalyzeRequest,
    x_vb_llm_provider: str | None = Header(default=None),
    x_vb_openai_api_key: str | None = Header(default=None),
    x_vb_openai_base_url: str | None = Header(default=None),
    x_vb_analysis_model: str | None = Header(default=None),
) -> AnalyzeResponse:
    model = (x_vb_analysis_model or "").strip() or route_analysis_model(data.metadata)
    provider_overrides = build_provider_overrides(
        api_key=x_vb_openai_api_key,
        base_url=x_vb_openai_base_url,
        provider_name=x_vb_llm_provider,
    )
    try:
        result = run_json_task(
            task_name="analysis",
            model=model,
            system_prompt=build_analysis_system_prompt(),
            user_prompt=build_analysis_user_content(data),
            fallback_factory=lambda: build_analysis_payload(data),
            validator=lambda payload: AnalysisPayload.model_validate(payload),
            temperature=0.4,
            max_retries=1,
            provider_overrides=provider_overrides,
            text_only_user_prompt=build_analysis_user_prompt(data),
        )
    except Exception as error:
        raise_service_error(error)

    return AnalyzeResponse(
        analysis=AnalysisPayload.model_validate(result.payload),
        model=result.model,
        provider=result.provider,
        fallback_used=result.fallback_used,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        total_tokens=result.total_tokens,
        provider_request_id=result.provider_request_id,
        retries=result.retries,
        latency_ms=result.latency_ms,
    )


@app.post("/ai/rag/compare", response_model=RagCompareResponse)
def rag_compare(
    data: RagCompareRequest,
    x_vb_llm_provider: str | None = Header(default=None),
    x_vb_openai_api_key: str | None = Header(default=None),
    x_vb_openai_base_url: str | None = Header(default=None),
    x_vb_embedding_model: str | None = Header(default=None),
    x_vb_pinecone_api_key: str | None = Header(default=None),
    x_vb_pinecone_index_host: str | None = Header(default=None),
    x_vb_pinecone_index_name: str | None = Header(default=None),
    x_vb_pinecone_namespace: str | None = Header(default=None),
) -> RagCompareResponse:
    provider_overrides = build_rag_provider_overrides(
        llm_provider=x_vb_llm_provider,
        openai_api_key=x_vb_openai_api_key,
        openai_base_url=x_vb_openai_base_url,
        embedding_model=x_vb_embedding_model,
        pinecone_api_key=x_vb_pinecone_api_key,
        pinecone_index_host=x_vb_pinecone_index_host,
        pinecone_index_name=x_vb_pinecone_index_name,
        pinecone_namespace=x_vb_pinecone_namespace,
    )
    try:
        result = run_benchmark_retrieval(data, data.top_k, provider_overrides)
    except Exception as error:
        raise_service_error(error)

    return RagCompareResponse(
        benchmarks=BenchmarksPayload.model_validate(result.payload),
        model=result.model,
        provider=result.provider,
        fallback_used=result.fallback_used,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        total_tokens=result.total_tokens,
        provider_request_id=result.provider_request_id,
        retries=result.retries,
        latency_ms=result.latency_ms,
    )


@app.post("/ai/rag/index", response_model=RagIndexResponse)
def rag_index(
    data: RagIndexRequest,
    x_vb_llm_provider: str | None = Header(default=None),
    x_vb_openai_api_key: str | None = Header(default=None),
    x_vb_openai_base_url: str | None = Header(default=None),
    x_vb_embedding_model: str | None = Header(default=None),
    x_vb_pinecone_api_key: str | None = Header(default=None),
    x_vb_pinecone_index_host: str | None = Header(default=None),
    x_vb_pinecone_index_name: str | None = Header(default=None),
    x_vb_pinecone_namespace: str | None = Header(default=None),
) -> RagIndexResponse:
    provider_overrides = build_rag_provider_overrides(
        llm_provider=x_vb_llm_provider,
        openai_api_key=x_vb_openai_api_key,
        openai_base_url=x_vb_openai_base_url,
        embedding_model=x_vb_embedding_model,
        pinecone_api_key=x_vb_pinecone_api_key,
        pinecone_index_host=x_vb_pinecone_index_host,
        pinecone_index_name=x_vb_pinecone_index_name,
        pinecone_namespace=x_vb_pinecone_namespace,
    )
    try:
        result = upsert_library_index([item.model_dump() for item in data.items], provider_overrides)
    except Exception as error:
        raise_service_error(error)
    return RagIndexResponse(**result)


@app.post("/ai/rag/delete", response_model=RagDeleteResponse)
def rag_delete(
    data: RagDeleteRequest,
    x_vb_llm_provider: str | None = Header(default=None),
    x_vb_openai_api_key: str | None = Header(default=None),
    x_vb_openai_base_url: str | None = Header(default=None),
    x_vb_embedding_model: str | None = Header(default=None),
    x_vb_pinecone_api_key: str | None = Header(default=None),
    x_vb_pinecone_index_host: str | None = Header(default=None),
    x_vb_pinecone_index_name: str | None = Header(default=None),
    x_vb_pinecone_namespace: str | None = Header(default=None),
) -> RagDeleteResponse:
    provider_overrides = build_rag_provider_overrides(
        llm_provider=x_vb_llm_provider,
        openai_api_key=x_vb_openai_api_key,
        openai_base_url=x_vb_openai_base_url,
        embedding_model=x_vb_embedding_model,
        pinecone_api_key=x_vb_pinecone_api_key,
        pinecone_index_host=x_vb_pinecone_index_host,
        pinecone_index_name=x_vb_pinecone_index_name,
        pinecone_namespace=x_vb_pinecone_namespace,
    )
    try:
        result = delete_library_index(data.ids, provider_overrides)
    except Exception as error:
        raise_service_error(error)
    return RagDeleteResponse(**result)


@app.post("/ai/score", response_model=ScoreResponse)
def score(
    data: ScoreRequest,
    x_vb_llm_provider: str | None = Header(default=None),
    x_vb_openai_api_key: str | None = Header(default=None),
    x_vb_openai_base_url: str | None = Header(default=None),
    x_vb_score_model: str | None = Header(default=None),
) -> ScoreResponse:
    model = (x_vb_score_model or "").strip() or route_score_model(data.metadata)
    provider_overrides = build_provider_overrides(
        api_key=x_vb_openai_api_key,
        base_url=x_vb_openai_base_url,
        provider_name=x_vb_llm_provider,
    )
    try:
        result = run_json_task(
            task_name="score",
            model=model,
            system_prompt=build_score_system_prompt(),
            user_prompt=build_score_user_prompt(data),
            fallback_factory=lambda: build_score_payload(data),
            validator=lambda payload: ScorePayload.model_validate(payload),
            temperature=0.2,
            max_retries=1,
            provider_overrides=provider_overrides,
        )
    except Exception as error:
        raise_service_error(error)

    return ScoreResponse(
        score=ScorePayload.model_validate(result.payload),
        model=result.model,
        provider=result.provider,
        fallback_used=result.fallback_used,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        total_tokens=result.total_tokens,
        provider_request_id=result.provider_request_id,
        retries=result.retries,
        latency_ms=result.latency_ms,
    )

