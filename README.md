# ViralBrain.ai MVP

This build uses Supabase Auth users (Google + Email Magic Link) and stores data with RLS-scoped user sessions.

## Implemented

- YouTube-only analysis workflow
- Next.js App Router + FastAPI AI service
- Streaming analyze flow and report detail pages
- Real YouTube Data API with mock fallback
- Optional mock/supabase data backend switch
- Supabase Auth login:
  - Google OAuth
  - Email Magic Link
- `demo-user` replaced with authenticated Supabase user ID
- Server writes now use user session + RLS (no service role dependency)
- Bilingual UI switch (English/Chinese) via navbar toggle

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

```

Notes:
- Browser auth requires `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `NEXT_PUBLIC_APP_URL` is optional. Leave empty to auto-use the current browser origin.
- Set `NEXT_PUBLIC_APP_URL` only when you need to override localhost callback (for example, tunnel URL).
- `SUPABASE_SERVICE_ROLE_KEY` is no longer required for current report/usage writes.
- `DATA_BACKEND=supabase` is recommended.

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

## Run

### 1) AI service

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r apps/ai-service/requirements.txt
npm run dev:ai
```

### 2) Web app

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

## Deployment (Vercel Monorepo)

Use Vercel project settings:

1. Framework Preset: `Next.js`
2. Root Directory: `apps/web`
3. Build Command: `npm run build` (default)
4. Output Directory: keep empty

Do not keep a root-level `vercel.json` with legacy `builds` entries. It triggers Vercel warning and bypasses Project Settings.

Troubleshooting:
- `401` on `*.vercel.app` means Deployment Protection is blocking public access. Disable protection for Production or use a custom production domain.
- `404` with `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` means that domain alias is detached/stale. Re-assign the domain in Vercel `Project -> Domains`.

Preflight check command (inside `apps/web`):

```bash
npm run deploy:check
```

## Auth Flow

- Open `/login`
- Sign in via Google or Email Magic Link
- After callback, redirected to `/dashboard`
- New reports are created with real `auth.user.id`

## Routes

- `/login`
- `/auth/callback` (legacy + server exchange)
- `/auth/confirm` (mobile/email callback compatibility)
- `/dashboard`
- `/report/[id]`
- `/library`
- `/settings`

## API

- Unified JSON envelope for non-stream routes: `ok/data/error/request_id`
- `POST /api/analyze` enforces daily quota and returns `429 USAGE_LIMIT_EXCEEDED` when exceeded
- Quota is hard-enforced in DB trigger (`usage_logs_daily_limit_guard`) to prevent concurrent bypass
- `POST /api/analyze` (requires auth)
- `GET /api/reports` (requires auth)
- `GET /api/reports/{id}` (requires auth, owner only)
- `GET /api/me` (requires auth)
- `POST /api/usage/consume` (requires auth)
- `POST /api/youtube/fetch` (requires auth)
- `POST /api/benchmarks` (requires auth)

## Next Upgrades

- Pinecone-based benchmark retrieval
- Real model provider usage/token tracing
- Stripe billing
