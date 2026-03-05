from __future__ import annotations

from app.schemas import Metadata


def route_analysis_model(_: Metadata) -> str:
    return "gpt-4o-mini"


def route_rag_model() -> str:
    return "gpt-4o"


def route_score_model(metadata: Metadata) -> str:
    if metadata.duration_sec > 600 or metadata.stats.view_count > 3_000_000:
        return "gpt-4o"
    return "gpt-4o-mini"
