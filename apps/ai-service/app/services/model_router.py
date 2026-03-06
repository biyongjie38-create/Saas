from __future__ import annotations

import os

from app.schemas import Metadata


def _env_or_default(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


def route_analysis_model(_: Metadata) -> str:
    return _env_or_default("OPENAI_ANALYSIS_MODEL", "gpt-4o-mini")


def route_score_model(metadata: Metadata) -> str:
    default = "gpt-4o" if metadata.duration_sec > 600 or metadata.stats.view_count > 3_000_000 else "gpt-4o-mini"
    return _env_or_default("OPENAI_SCORE_MODEL", default)
