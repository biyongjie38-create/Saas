from __future__ import annotations

import os

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration


def _read_sample_rate(value: str | None, fallback: float = 0.0) -> float:
    raw = (value or "").strip()
    if not raw:
        return fallback

    try:
        parsed = float(raw)
    except ValueError:
        return fallback

    return max(0.0, min(1.0, parsed))


def init_sentry() -> None:
    dsn = (os.getenv("SENTRY_DSN") or "").strip()
    if not dsn:
        return

    sentry_sdk.init(
        dsn=dsn,
        environment=(
            os.getenv("SENTRY_ENVIRONMENT")
            or os.getenv("APP_RUNTIME_MODE")
            or os.getenv("AI_RUNTIME_MODE")
            or "development"
        ),
        traces_sample_rate=_read_sample_rate(os.getenv("SENTRY_TRACES_SAMPLE_RATE"), 0.0),
        send_default_pii=False,
        integrations=[FastApiIntegration(transaction_style="url")],
    )
