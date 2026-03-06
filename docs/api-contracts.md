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

All non-stream JSON responses use:

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

## 1) POST /api/analyze

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "stream": true
}
```

Stream events:

- `fetching_youtube`
- `report_created`
- `analysis`
- `benchmark`
- `score`
- `done`
- `error`

Notes:
- Free users are hard-limited by daily quota.
- Exceeded quota returns `429` with `error.code = "USAGE_LIMIT_EXCEEDED"`.

## 2) GET /api/reports

Query:

- `limit` (default 20)
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

## 5) FastAPI /ai/score

Request fields:

- metadata
- analysis
- benchmarks (optional)

Response:

```json
{
  "score": {
    "total": 78,
    "breakdown": {
      "title": 76,
      "thumbnail": 82,
      "hook": 81,
      "pacing": 72,
      "value_density": 77,
      "emotion_resonance": 69
    },
    "top_actions": ["..."]
  }
}
```

