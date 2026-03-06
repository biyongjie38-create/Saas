# API Contracts (MVP)

## Auth

All product APIs require a valid Supabase session cookie.

Browser login paths:

- `GET /login`
- `GET /auth/callback`
- `GET /auth/confirm`
- `POST /auth/signout`

Server-side DB writes run through authenticated user session + RLS policies.

## Unified Response

All `/api/*` JSON responses use:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "request_id": "req-or-uuid"
}
```

Error shape:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "SCHEMA_INVALID",
    "message": "...",
    "details": {}
  },
  "request_id": "req-or-uuid"
}
```

All `/api/*` responses also include header:

- `x-request-id: <same-as-body-request_id>`

Unhandled server exceptions are normalized to:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Unexpected server error."
  },
  "request_id": "req-or-uuid"
}
```

## 1) POST /api/analyze

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "stream": true
}
```

When `stream=true`, SSE event names are:

- `fetching_youtube`
- `report_created`
- `analysis`
- `benchmark`
- `score`
- `done`
- `error`

Each SSE `data:` payload uses the same envelope shape.

Notes:

- Free users are hard-limited by daily quota.
- Exceeded quota returns `429` with `error.code = "USAGE_LIMIT_EXCEEDED"`.
- Final stored report includes `model_trace` with model/provider/tokens/latency for each stage.

## 2) GET /api/reports

Query:

- `limit` (default 20, max 50)
- `cursor` (optional)

Response `data`:

```json
{
  "items": [],
  "next_cursor": null
}
```

## 3) GET /api/reports/{id}

Returns report only if `report.user_id === auth.user.id`.

Response `data`:

```json
{
  "report": {},
  "video": {}
}
```

## 4) GET /api/me

Returns current auth user plus usage summary.

Response `data`:

```json
{
  "user": {},
  "usage": {
    "used_today": 0,
    "limit_per_day": 5,
    "remaining": 5
  }
}
```

## 5) POST /api/benchmarks

Response `data`:

```json
{
  "benchmarks": {
    "top_matches": []
  },
  "model_trace": {
    "model": "text-embedding-3-small -> pinecone",
    "provider": "openai+pinecone",
    "fallbackUsed": false,
    "latencyMs": 420
  }
}
```

Notes:

- The AI service infers metadata filters from `topic_hint` and `structure_summary` and applies them to Pinecone query metadata when possible.
- If OpenAI embeddings or Pinecone retrieval is unavailable, the service falls back to local similarity ranking and returns `provider = "local"`.

## 6) POST /api/library/import

Request:

```json
{
  "format": "json",
  "content": "[{\"title\":\"...\",\"summary\":\"...\"}]"
}
```

Allowed formats:

- `json`: array of items or `{ "items": [...] }`
- `csv`: header row required

Minimal import item fields:

```json
{
  "title": "Hook teardown",
  "sourceUrl": "https://youtube.com/watch?v=demo",
  "summary": "Outcome first, then conflict.",
  "tags": {
    "hookType": "result-first",
    "topic": "education",
    "durationBucket": "5-10m"
  }
}
```

Response `data`:

```json
{
  "imported_count": 1,
  "items": []
}
```

Notes:

- Requires auth.
- Server deduplicates by stable `embedding_key`.
- Supabase requires the latest `viral_library_items` RLS policies from `supabase/schema.sql`.

## 7) POST /api/youtube/fetch

Response `data`:

```json
{
  "video": {},
  "source": "youtube_api"
}
```

## 8) POST /api/usage/consume

Response `data`:

```json
{
  "usage": {}
}
```

## 9) FastAPI /ai/* execution metadata

`/ai/analyze`, `/ai/rag/compare`, and `/ai/score` return payload plus execution trace metadata:

```json
{
  "model": "gpt-4o-mini",
  "provider": "openai",
  "fallback_used": false,
  "input_tokens": 123,
  "output_tokens": 87,
  "total_tokens": 210,
  "provider_request_id": "req_...",
  "retries": 0,
  "latency_ms": 1420
}
```

Benchmark retrieval usually returns a trace like:

```json
{
  "model": "text-embedding-3-small -> pinecone",
  "provider": "openai+pinecone",
  "fallback_used": false,
  "input_tokens": 48,
  "output_tokens": 0,
  "total_tokens": 48,
  "provider_request_id": "req_...",
  "retries": 0,
  "latency_ms": 350
}
```

If external providers are unavailable or `AI_PROVIDER=local`, the service falls back to local deterministic logic and sets:

- `provider = "local"`
- `fallback_used = true` when fallback happened from `auto`/`openai`
- `fallback_used = false` when local mode was explicitly requested
