from __future__ import annotations

from fastapi import FastAPI, Header

from app.runtime_env import load_runtime_env
from app.schemas import (
    AnalysisPayload,
    AnalyzeRequest,
    AnalyzeResponse,
    BenchmarksPayload,
    RagCompareRequest,
    RagCompareResponse,
    ScorePayload,
    ScoreRequest,
    ScoreResponse,
)
from app.services.analysis import (
    build_analysis_payload,
    build_analysis_system_prompt,
    build_analysis_user_prompt,
)
from app.services.model_router import (
    route_analysis_model,
    route_score_model,
)
from app.services.provider import build_provider_overrides, run_json_task
from app.services.rag import build_rag_provider_overrides, run_benchmark_retrieval
from app.services.scoring import (
    build_score_payload,
    build_score_system_prompt,
    build_score_user_prompt,
)

load_runtime_env()

app = FastAPI(title="ViralBrain AI Service", version="0.3.1")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/ai/analyze", response_model=AnalyzeResponse)
def analyze(
    data: AnalyzeRequest,
    x_vb_openai_api_key: str | None = Header(default=None),
    x_vb_openai_base_url: str | None = Header(default=None),
) -> AnalyzeResponse:
    model = route_analysis_model(data.metadata)
    provider_overrides = build_provider_overrides(
        api_key=x_vb_openai_api_key,
        base_url=x_vb_openai_base_url,
    )
    result = run_json_task(
        task_name="analysis",
        model=model,
        system_prompt=build_analysis_system_prompt(),
        user_prompt=build_analysis_user_prompt(data),
        fallback_factory=lambda: build_analysis_payload(data),
        validator=lambda payload: AnalysisPayload.model_validate(payload),
        temperature=0.4,
        max_retries=1,
        provider_overrides=provider_overrides,
    )

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
    x_vb_openai_api_key: str | None = Header(default=None),
    x_vb_openai_base_url: str | None = Header(default=None),
    x_vb_pinecone_api_key: str | None = Header(default=None),
    x_vb_pinecone_index_host: str | None = Header(default=None),
    x_vb_pinecone_index_name: str | None = Header(default=None),
    x_vb_pinecone_namespace: str | None = Header(default=None),
) -> RagCompareResponse:
    provider_overrides = build_rag_provider_overrides(
        openai_api_key=x_vb_openai_api_key,
        openai_base_url=x_vb_openai_base_url,
        pinecone_api_key=x_vb_pinecone_api_key,
        pinecone_index_host=x_vb_pinecone_index_host,
        pinecone_index_name=x_vb_pinecone_index_name,
        pinecone_namespace=x_vb_pinecone_namespace,
    )
    result = run_benchmark_retrieval(data, data.top_k, provider_overrides)

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


@app.post("/ai/score", response_model=ScoreResponse)
def score(
    data: ScoreRequest,
    x_vb_openai_api_key: str | None = Header(default=None),
    x_vb_openai_base_url: str | None = Header(default=None),
) -> ScoreResponse:
    model = route_score_model(data.metadata)
    provider_overrides = build_provider_overrides(
        api_key=x_vb_openai_api_key,
        base_url=x_vb_openai_base_url,
    )
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
