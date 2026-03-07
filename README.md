# ViralBrain.ai MVP

This build uses Supabase Auth users (Google + Email Magic Link) and stores data with RLS-scoped user sessions.

## Implemented

- YouTube-only analysis workflow
- Next.js App Router + FastAPI AI service
- Streaming analyze flow and report detail pages
- Report detail page upgraded to 5 tabs (Snapshot / Structure / Thumbnail / Audience / Playbook)
- Real YouTube Data API with mock fallback
- AI service with real-model priority and local fallback
- Pinecone-backed benchmark retrieval with local fallback
- Optional mock/supabase data backend switch
- Supabase Auth login:
  - Google OAuth
  - Email Magic Link
- `demo-user` replaced with authenticated Supabase user ID
- Server writes now use user session + RLS (no service role dependency)
- Bilingual UI switch (English/Chinese) via navbar toggle
- Viral Library search + JSON/CSV import workflow
- Stripe hosted membership checkout + webhook reconciliation

## Project Structure

```txt
apps/
  web/          # Next.js frontend + API routes + auth
  ai-service/   # FastAPI AI service
supabase/
  schema.sql
docs/
  api-contracts.md
  deployment-vercel.md
```

## Environment

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_APP_URL=
AI_SERVICE_URL=http://127.0.0.1:8000

YOUTUBE_API_KEY=
YOUTUBE_FETCH_MODE=auto

DATA_BACKEND=supabase

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Optional server aliases (fallback)
SUPABASE_URL=
SUPABASE_ANON_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Optional: reuse Stripe recurring prices instead of inline price_data
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
STRIPE_CURRENCY=cny
```

Create `apps/ai-service/.env` or export these vars before running FastAPI:

```bash
AI_PROVIDER=auto
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_TIMEOUT_SEC=20
OPENAI_ANALYSIS_MODEL=gpt-4o-mini
OPENAI_SCORE_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
PINECONE_API_KEY=
PINECONE_INDEX_HOST=
PINECONE_INDEX_NAME=
PINECONE_NAMESPACE=viral-library
```

Notes:
- Browser auth requires `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `NEXT_PUBLIC_APP_URL` is optional. Leave empty to auto-use the current browser origin.
- Set `NEXT_PUBLIC_APP_URL` only when you need to override localhost callback (for example, tunnel URL).
- `SUPABASE_SERVICE_ROLE_KEY` is no longer required for current report/usage writes.
- `SUPABASE_SERVICE_ROLE_KEY` becomes required when you want Stripe webhooks to reconcile paid subscriptions back into Supabase.
- `DATA_BACKEND=supabase` is recommended.
- `AI_PROVIDER=auto` means: try OpenAI first, then fall back to local deterministic logic.
- `AI_PROVIDER=local` forces local fallback mode for analysis, benchmark retrieval, and score.
- Benchmark retrieval tries OpenAI embeddings + Pinecone first. If either side is unavailable, it falls back to local similarity ranking.

## Auth Redirect Strategy (for real users)

To allow external users to log in, you must use a public HTTPS domain.

1. Deploy web app to a public URL (for example Vercel domain or your own domain).
2. In Supabase `Auth -> URL Configuration`:
   - Site URL: `https://your-domain.com`
   - Redirect URLs include: `https://your-domain.com/auth/callback`
3. In deployed env, set:
   - `NEXT_PUBLIC_APP_URL=https://your-domain.com` (optional but recommended)

Localhost/LAN (`localhost`, `192.168.x.x`) only works on same device/network and is not suitable for public users.

## Supabase Auth Setup

1. In Supabase dashboard, enable providers:
   - Auth -> Providers -> Google
   - Auth -> Providers -> Email
2. Set Site URL and redirect URLs (Auth -> URL Configuration).
3. For production, add your deployed domain callback URL.

## Database Setup

1. Open SQL Editor in Supabase.
2. Run `supabase/schema.sql`.
3. Ensure tables exist: `videos`, `reports`, `usage_logs`, `viral_library_items`.
4. Confirm trigger `usage_logs_daily_limit_guard` exists on `usage_logs` (hard quota intercept).
5. Confirm RLS is enabled on these tables and policies are created.
6. Re-run `supabase/schema.sql` after pulling latest changes so:
   - `viral_library_items` gets:
   - `embedding_key` unique index
   - authenticated insert/update policies for library import
   - `membership_orders` gets Stripe columns (`provider_session_id`, `provider_subscription_id`, etc.)
   - `membership_orders_update_own` policy exists for post-checkout reconciliation

## Run

### Web

```bash
cd apps/web
npm install
npm run dev
```

### AI service

```bash
cd apps/ai-service
python -m venv .venv
. .venv/Scripts/Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Index viral library into Pinecone

Create a Pinecone cosine index whose dimension matches your embedding model. If you keep the default `text-embedding-3-small`, use dimension `1536`.

Then run:

```bash
cd apps/ai-service
python scripts/index_viral_library.py
```

Optional flags:

```bash
python scripts/index_viral_library.py --index-host=... --namespace=viral-library --batch-size=50
```

## Pages

- `/`
- `/login`
- `/auth/callback` (legacy + server exchange)
- `/auth/confirm` (mobile/email callback compatibility)
- `/dashboard`
- `/report/[id]`
- `/library`
- `/settings`

## API

- Unified JSON envelope for all `/api/*` JSON routes: `ok/data/error/request_id` + `x-request-id` header
- `/api/analyze` SSE events also use the same envelope shape inside `data:` payloads
- `POST /api/analyze` enforces daily quota and returns `429 USAGE_LIMIT_EXCEEDED` when exceeded
- Quota is hard-enforced in DB trigger (`usage_logs_daily_limit_guard`) to prevent concurrent bypass
- `POST /api/analyze` (requires auth)
- `POST /api/library/import` (requires auth, JSON/CSV import)
- `GET /api/reports` (requires auth)
- `GET /api/reports/{id}` (requires auth, owner only)
- `GET /api/me` (requires auth)
- `POST /api/usage/consume` (requires auth)
- `POST /api/youtube/fetch` (requires auth)
- `POST /api/benchmarks` (requires auth)
- `POST /api/membership/checkout` (requires auth, creates Stripe Checkout session)
- `POST /api/membership/checkout/confirm` (requires auth, verifies a completed Stripe session)
- `POST /api/membership/webhook/stripe` (Stripe webhook endpoint)

## Release QA

Item 7 adds a release-gate QA harness focused on the core path:

- Login
- Analyze a YouTube URL
- Open the generated report
- Verify fallback/degradation notices are visible when mock or local fallback paths are used

Run the smoke suite locally:

```bash
cd apps/web
npm run qa:release
```

Run the 20-cycle stability gate:

```bash
cd apps/web
npm run qa:release:20
```

The QA harness starts Next.js in a deterministic release-check mode with:

```bash
DATA_BACKEND=mock
ENABLE_E2E_AUTH_BYPASS=true
YOUTUBE_FETCH_MODE=mock
AI_SERVICE_MODE=local
```

This avoids external auth/API dependence and verifies the release candidate can repeatedly complete the main product flow without interruption.

## RLS Smoke Test

Use the SQL smoke script before release to verify Supabase RLS behavior:

```bash
supabase/rls-smoke.sql
```

What it checks:

- a user can read their own `reports`
- a user can read their own `usage_logs`
- another user cannot read or update those rows
- authenticated users can read shared `videos`
- authenticated users can read and update shared `viral_library_items`

The script is wrapped in a transaction and ends with `rollback`, so it does not leave QA rows behind.

## Fault Degradation UX

The dashboard and report pages now surface explicit fallback notices when:

- mock YouTube data is used
- local AI fallback is used because the remote AI path is unavailable

These notices are part of the release smoke flow so degraded behavior is visible to users instead of silently changing output quality.

## Current Preview Limits

- `/` is intentionally a product overview page, not a live data dashboard.
- `/dashboard/trends` still uses curated preview rows for hot videos/channels/topics.
- Real/provider-backed paths currently exist in single-video fetch, viral collection, BYOK testing, and membership checkout.
