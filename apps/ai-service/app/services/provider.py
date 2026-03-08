from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any, Callable

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


@dataclass(frozen=True)
class ProviderOverrides:
    api_key: str | None = None
    base_url: str | None = None
    provider_name: str | None = None


@dataclass
class ModelExecution:
    payload: dict[str, Any]
    model: str
    provider: str
    fallback_used: bool
    retries: int
    latency_ms: int
    input_tokens: int
    output_tokens: int
    total_tokens: int
    provider_request_id: str | None = None


def build_provider_overrides(
    api_key: str | None = None,
    base_url: str | None = None,
    provider_name: str | None = None,
) -> ProviderOverrides | None:
    resolved_key = (api_key or "").strip() or None
    resolved_base_url = (base_url or "").strip() or None
    resolved_provider = (provider_name or "").strip() or None
    if not resolved_key and not resolved_base_url and not resolved_provider:
        return None
    return ProviderOverrides(api_key=resolved_key, base_url=resolved_base_url, provider_name=resolved_provider)


def get_provider_mode() -> str:
    value = os.getenv("AI_PROVIDER", "auto").strip().lower()
    if value in {"auto", "openai", "local"}:
        return value
    return "auto"


def get_billing_mode() -> str:
    value = os.getenv("AI_BILLING_MODE", "byok").strip().lower()
    if value == "hybrid":
        return "hybrid"
    return "byok"


def get_runtime_mode() -> str:
    value = (os.getenv("AI_RUNTIME_MODE") or os.getenv("APP_RUNTIME_MODE") or "preview").strip().lower()
    if value == "production":
        return "production"
    return "preview"


def is_production_runtime_mode() -> bool:
    return get_runtime_mode() == "production"


def allow_local_fallbacks() -> bool:
    return not is_production_runtime_mode()


def allow_server_provider_fallback() -> bool:
    return get_billing_mode() == "hybrid"


def _resolve_timeout() -> float:
    raw = os.getenv("OPENAI_TIMEOUT_SEC", "20").strip()
    try:
        return max(5.0, float(raw))
    except ValueError:
        return 20.0


def _has_openai_credentials(overrides: ProviderOverrides | None = None) -> bool:
    if OpenAI is None:
        return False
    if overrides and overrides.api_key:
        return True
    if not allow_server_provider_fallback():
        return False
    return bool(os.getenv("OPENAI_API_KEY"))


def _should_try_openai(overrides: ProviderOverrides | None = None) -> bool:
    mode = get_provider_mode()
    if mode == "local":
        return False
    return _has_openai_credentials(overrides)


def _resolve_provider_name(overrides: ProviderOverrides | None = None) -> str:
    if overrides and overrides.provider_name:
        return overrides.provider_name
    return "openai"


def _create_openai_client(overrides: ProviderOverrides | None = None) -> Any:
    if OpenAI is None:
        raise RuntimeError("OPENAI_SDK_MISSING")

    api_key = overrides.api_key if overrides and overrides.api_key else None
    base_url = overrides.base_url if overrides and overrides.base_url else None

    if allow_server_provider_fallback():
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        base_url = base_url or os.getenv("OPENAI_BASE_URL")

    if not api_key:
        raise RuntimeError("AI_PROVIDER_CREDENTIALS_MISSING")

    kwargs: dict[str, Any] = {
        "api_key": api_key,
        "timeout": _resolve_timeout(),
        "max_retries": 0,
    }

    if base_url:
        kwargs["base_url"] = base_url

    return OpenAI(**kwargs)


def _extract_message_content(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            text = getattr(item, "text", None)
            if isinstance(text, str):
                chunks.append(text)
                continue

            if isinstance(item, dict) and isinstance(item.get("text"), str):
                chunks.append(str(item["text"]))

        return "\n".join(chunks)

    return "{}"


def _extract_usage(response: Any) -> tuple[int, int, int]:
    usage = getattr(response, "usage", None)
    if usage is None:
        return 0, 0, 0

    input_tokens = getattr(usage, "prompt_tokens", None)
    if input_tokens is None:
        input_tokens = getattr(usage, "input_tokens", 0)

    output_tokens = getattr(usage, "completion_tokens", None)
    if output_tokens is None:
        output_tokens = getattr(usage, "output_tokens", 0)

    total_tokens = getattr(usage, "total_tokens", None)
    if total_tokens is None:
        total_tokens = int(input_tokens or 0) + int(output_tokens or 0)

    return int(input_tokens or 0), int(output_tokens or 0), int(total_tokens or 0)


def _call_openai_json(
    *,
    model: str,
    system_prompt: str,
    user_prompt: Any,
    temperature: float,
    provider_overrides: ProviderOverrides | None = None,
) -> tuple[dict[str, Any], str, int, int, int, str | None]:
    client = _create_openai_client(provider_overrides)
    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "developer", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    content = _extract_message_content(response.choices[0].message.content)
    payload = json.loads(content)
    input_tokens, output_tokens, total_tokens = _extract_usage(response)
    resolved_model = getattr(response, "model", None) or model
    provider_request_id = getattr(response, "_request_id", None)

    return payload, resolved_model, input_tokens, output_tokens, total_tokens, provider_request_id


def run_json_task(
    *,
    task_name: str,
    model: str,
    system_prompt: str,
    user_prompt: Any,
    fallback_factory: Callable[[], dict[str, Any]],
    validator: Callable[[dict[str, Any]], Any],
    temperature: float = 0.3,
    max_retries: int = 1,
    provider_overrides: ProviderOverrides | None = None,
    text_only_user_prompt: str | None = None,
) -> ModelExecution:
    started = time.perf_counter()
    mode = get_provider_mode()
    last_error: Exception | None = None
    provider_name = _resolve_provider_name(provider_overrides)

    if mode == "local":
        if not allow_local_fallbacks():
            raise RuntimeError("AI_PROVIDER_LOCAL_MODE_DISABLED")
        payload = fallback_factory()
        validator(payload)
        return ModelExecution(
            payload=payload,
            model=f"local::{task_name}",
            provider="local",
            fallback_used=False,
            retries=0,
            latency_ms=int((time.perf_counter() - started) * 1000),
            input_tokens=0,
            output_tokens=0,
            total_tokens=0,
            provider_request_id=None,
        )

    if _should_try_openai(provider_overrides):
        for attempt in range(max_retries + 1):
            try:
                payload, resolved_model, input_tokens, output_tokens, total_tokens, provider_request_id = _call_openai_json(
                    model=model,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature,
                    provider_overrides=provider_overrides,
                )
                validator(payload)
                return ModelExecution(
                    payload=payload,
                    model=resolved_model,
                    provider=provider_name,
                    fallback_used=False,
                    retries=attempt,
                    latency_ms=int((time.perf_counter() - started) * 1000),
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens,
                    provider_request_id=provider_request_id,
                )
            except Exception as exc:
                if text_only_user_prompt and not isinstance(user_prompt, str):
                    try:
                        payload, resolved_model, input_tokens, output_tokens, total_tokens, provider_request_id = _call_openai_json(
                            model=model,
                            system_prompt=system_prompt,
                            user_prompt=text_only_user_prompt,
                            temperature=temperature,
                            provider_overrides=provider_overrides,
                        )
                        validator(payload)
                        return ModelExecution(
                            payload=payload,
                            model=resolved_model,
                            provider=provider_name,
                            fallback_used=False,
                            retries=attempt,
                            latency_ms=int((time.perf_counter() - started) * 1000),
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                            total_tokens=total_tokens,
                            provider_request_id=provider_request_id,
                        )
                    except Exception as text_only_exc:
                        last_error = text_only_exc
                        print(f"[ai-service][{task_name}] {provider_name} text-only retry after multimodal failure: {text_only_exc}")
                        continue

                last_error = exc
                print(f"[ai-service][{task_name}] {provider_name} attempt {attempt + 1} failed: {exc}")
    elif mode == "openai":
        print(f"[ai-service][{task_name}] {provider_name} requested but SDK/key is unavailable.")

    if not allow_local_fallbacks():
        if last_error is not None:
            raise RuntimeError("AI_PROVIDER_REQUEST_FAILED") from last_error
        raise RuntimeError("AI_PROVIDER_CREDENTIALS_MISSING")

    payload = fallback_factory()
    validator(payload)

    return ModelExecution(
        payload=payload,
        model=f"local::{task_name}",
        provider="local",
        fallback_used=mode != "local",
        retries=max_retries if last_error is not None else 0,
        latency_ms=int((time.perf_counter() - started) * 1000),
        input_tokens=0,
        output_tokens=0,
        total_tokens=0,
        provider_request_id=None,
    )


def build_local_execution(task_name: str, model: str, payload: dict[str, Any]) -> ModelExecution:
    return ModelExecution(
        payload=payload,
        model=model,
        provider="local",
        fallback_used=False,
        retries=0,
        latency_ms=0,
        input_tokens=0,
        output_tokens=0,
        total_tokens=0,
        provider_request_id=None,
    )

