from __future__ import annotations

from fastapi import FastAPI

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
from app.services.provider import run_json_task
from app.services.rag import run_benchmark_retrieval
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
def analyze(data: AnalyzeRequest) -> AnalyzeResponse:
    model = route_analysis_model(data.metadata)
    result = run_json_task(
        task_name="analysis",
        model=model,
        system_prompt=build_analysis_system_prompt(),
        user_prompt=build_analysis_user_prompt(data),
        fallback_factory=lambda: build_analysis_payload(data),
        validator=lambda payload: AnalysisPayload.model_validate(payload),
        temperature=0.4,
        max_retries=1,
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
def rag_compare(data: RagCompareRequest) -> RagCompareResponse:
    result = run_benchmark_retrieval(data, data.top_k)

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
def score(data: ScoreRequest) -> ScoreResponse:
    model = route_score_model(data.metadata)
    result = run_json_task(
        task_name="score",
        model=model,
        system_prompt=build_score_system_prompt(),
        user_prompt=build_score_user_prompt(data),
        fallback_factory=lambda: build_score_payload(data),
        validator=lambda payload: ScorePayload.model_validate(payload),
        temperature=0.2,
        max_retries=1,
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
