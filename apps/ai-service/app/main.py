from __future__ import annotations

import time
from typing import Callable

from fastapi import FastAPI, HTTPException
from pydantic import ValidationError

from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    RagCompareRequest,
    RagCompareResponse,
    ScoreRequest,
    ScoreResponse,
)
from app.services.analysis import build_analysis_payload
from app.services.model_router import (
    route_analysis_model,
    route_rag_model,
    route_score_model,
)
from app.services.rag import build_benchmark_payload
from app.services.scoring import build_score_payload

app = FastAPI(title="ViralBrain AI Service", version="0.1.0")


def validate_with_retry(factory: Callable[[], dict], retries: int = 2) -> tuple[dict, int]:
    attempts = 0
    last_error: ValidationError | None = None

    while attempts <= retries:
        try:
            payload = factory()
            return payload, attempts
        except ValidationError as exc:
            last_error = exc
            attempts += 1

    if last_error is None:
        raise HTTPException(status_code=500, detail="SCHEMA_UNKNOWN")
    raise HTTPException(status_code=422, detail="SCHEMA_INVALID")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/ai/analyze", response_model=AnalyzeResponse)
def analyze(data: AnalyzeRequest) -> AnalyzeResponse:
    model = route_analysis_model(data.metadata)
    started = time.perf_counter()

    def _factory() -> dict:
        payload = build_analysis_payload(data)
        validated = AnalyzeResponse(
            analysis=payload,
            model=model,
            retries=0,
            latency_ms=0,
        )
        return validated.model_dump()

    result, retries = validate_with_retry(_factory)
    latency_ms = int((time.perf_counter() - started) * 1000)

    result["retries"] = retries
    result["latency_ms"] = latency_ms

    return AnalyzeResponse.model_validate(result)


@app.post("/ai/rag/compare", response_model=RagCompareResponse)
def rag_compare(data: RagCompareRequest) -> RagCompareResponse:
    model = route_rag_model()
    started = time.perf_counter()

    def _factory() -> dict:
        payload = build_benchmark_payload(data)
        validated = RagCompareResponse(
            benchmarks=payload,
            model=model,
            retries=0,
            latency_ms=0,
        )
        return validated.model_dump()

    result, retries = validate_with_retry(_factory)
    latency_ms = int((time.perf_counter() - started) * 1000)

    result["retries"] = retries
    result["latency_ms"] = latency_ms

    return RagCompareResponse.model_validate(result)


@app.post("/ai/score", response_model=ScoreResponse)
def score(data: ScoreRequest) -> ScoreResponse:
    model = route_score_model(data.metadata)
    started = time.perf_counter()

    def _factory() -> dict:
        payload = build_score_payload(data)
        validated = ScoreResponse(
            score=payload,
            model=model,
            retries=0,
            latency_ms=0,
        )
        return validated.model_dump()

    result, retries = validate_with_retry(_factory)
    latency_ms = int((time.perf_counter() - started) * 1000)

    result["retries"] = retries
    result["latency_ms"] = latency_ms

    return ScoreResponse.model_validate(result)
