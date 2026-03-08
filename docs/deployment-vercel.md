# Production Deployment (Public Login)

## Goal

Make ViralBrain accessible to external users with stable email/Google login.

## 1) Deploy web app to public HTTPS domain

Recommended: Vercel.

- Import repo.
- Set Framework Preset to `Next.js`.
- Set Root Directory to `apps/web`.
- Keep Build Command as default (`npm run build`) and Output Directory empty.
- Do not use root-level `vercel.json` legacy `builds` overrides.

## 2) Set production env vars

In your deployment platform, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `AI_SERVICE_URL`
- `NEXT_PUBLIC_APP_URL` (recommended): `https://your-domain.com`
- `DATA_BACKEND=supabase`

If you enable Stripe billing, also set these server-only env vars in the web app:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_PRO_MONTHLY_PRICE_ID` (optional)
- `STRIPE_PRO_YEARLY_PRICE_ID` (optional)
- `STRIPE_CURRENCY` (optional, defaults to `cny`)

`SUPABASE_SERVICE_ROLE_KEY` is required because the Stripe webhook uses an admin Supabase client to update membership state after checkout and subscription events. Never expose this key in client-side env vars.

For the FastAPI AI service, set:

- `AI_PROVIDER=auto`
- `AI_BILLING_MODE=byok` (recommended) or `AI_BILLING_MODE=hybrid`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL` (optional)
- `OPENAI_ANALYSIS_MODEL` (optional)
- `OPENAI_SCORE_MODEL` (optional)
- `OPENAI_EMBEDDING_MODEL` (optional, default `text-embedding-3-small`)
- `PINECONE_API_KEY`
- `PINECONE_INDEX_HOST` or `PINECONE_INDEX_NAME`
- `PINECONE_NAMESPACE` (optional, default `viral-library`)

Recommended commercial boundary:

- `AI_BILLING_MODE=byok`: user-provided browser keys are required for model and Pinecone calls; server env keys are not used as a hidden fallback.
- `AI_BILLING_MODE=hybrid`: the platform may spend its own `OPENAI_*` and `PINECONE_*` credentials when the user does not provide BYOK values.

Optional observability envs:

- Web: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_TRACES_SAMPLE_RATE`
- Web source maps (optional): `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- AI Service: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`
- Product analytics: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (defaults to `https://us.i.posthog.com`)

Recommended PostHog setup:

- Create a PostHog project and copy the Web SDK project API key into `NEXT_PUBLIC_POSTHOG_KEY`.
- Use the region host that matches your PostHog project:
  - US cloud: `https://us.i.posthog.com`
  - EU cloud: `https://eu.i.posthog.com`
- ViralBrain now tracks the main product funnel:
  - analysis started / completed / failed
  - membership checkout started / confirmed / cancelled / failed
  - share link created / revoked
  - report rerun started / completed / failed
  - PDF export success / failure

## 3) Prepare Pinecone benchmark index

Before enabling real benchmark retrieval, create a Pinecone cosine index whose dimension matches your embedding model.

- If you keep the default `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`, create a `1536`-dimension cosine index.
- Save either the index host as `PINECONE_INDEX_HOST` or the index name as `PINECONE_INDEX_NAME`.
- From `apps/ai-service`, run:

```bash
python scripts/index_viral_library.py
```

This upserts the bundled viral library records with metadata fields used for retrieval filters: `topic`, `hook_type`, and `duration_bucket`.

## 4) Configure Supabase Auth URLs

In Supabase Dashboard -> Auth -> URL Configuration:

- Site URL: `https://your-domain.com`
- Redirect URLs:
  - `https://your-domain.com/auth/callback`
  - `https://your-domain.com/auth/confirm`

If you have preview domains, add each callback URL explicitly.

## 5) Provider setup

In Supabase Dashboard -> Auth -> Providers:

- Enable Email
- Enable Google OAuth

For Google OAuth, ensure Google console redirect URI matches Supabase provider requirements.

## 6) Run deployment check

Before going live, run locally inside `apps/web`:

```bash
npm run deploy:check
```

This checks required env vars and warns for localhost/private/non-HTTPS callback origins.

## 7) Verify end-to-end

- Open `https://your-domain.com/login`
- Confirm callback preview shows your public domain
- Test Email Magic Link on mobile network (not your localhost)
- Confirm redirect to `/dashboard`
- Run one analysis and open report detail
- Confirm report page shows model/provider/token/latency trace
- Confirm benchmark trace shows `openai+pinecone` when Pinecone is configured
- Complete one Stripe test checkout and confirm the webhook endpoint `https://your-domain.com/api/membership/webhook/stripe` updates the user's membership state

## 8) Configure uptime monitoring

Recommended: Better Stack. Fallback: UptimeRobot.

Create these HTTP monitors after the app is public:

- Web readiness: `https://your-domain.com/api/ready`
  - Use this as the primary production alert.
  - It returns `503` when required runtime dependencies are not ready, including AI service reachability.
- Web health: `https://your-domain.com/api/health`
  - Use this as a lightweight process-level monitor.
  - It stays `200` while the web app is alive, even if a dependency is degraded.
- AI service health: `https://your-ai-service-domain.com/health`
  - Monitor the FastAPI service separately so you can distinguish “web down” from “AI backend down”.

Recommended alert policy:

- Check interval: `60s` for readiness and AI service, `180-300s` for lightweight health.
- Alert channels: at least email plus one realtime channel such as WeCom, Slack, Telegram, or phone.
- Require multiple consecutive failures before opening an incident to reduce flapping.

Recommended Better Stack monitor fields:

- Monitor type: HTTP / HTTPS
- Expected status: `200`
- URL keyword check:
  - `/api/ready` and `/api/health`: JSON contains `"ok":true`
  - `/health`: JSON contains `"ok": true`

If you prefer UptimeRobot:

- Create the same three HTTP(S) monitors with the same URLs.
- Free plans usually check less frequently; paid plans are better for production response time.

## 9) Configure public API rate limiting

Recommended: Upstash Redis for distributed serverless rate limiting.

Set these env vars in the web app if you want production-grade shared limits across instances:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Current protection already in code:

- `/api/hot-trends` is rate limited.
- Anonymous preview traffic is limited more aggressively than signed-in traffic.
- Requests that use the platform server key are limited more aggressively than requests using the user's own YouTube key.

Behavior without Upstash:

- The app still rate limits, but only with local in-memory counters inside each process.
- This is acceptable for local development, but weaker in multi-instance production.

## 10) Configure branded email delivery

Recommended: Resend.

Set these env vars in the web app:

- `RESEND_API_KEY`
- `SUPPORT_FROM_EMAIL`
- `SUPPORT_TO_EMAIL` (optional but recommended)

What this enables now:

- `/support` includes a real contact form.
- The platform sends one branded email to your support inbox.
- The user also receives a confirmation email.

Operational notes:

- `SUPPORT_FROM_EMAIL` must use a domain that is verified in Resend.
- If `SUPPORT_TO_EMAIL` is missing, the app falls back to `NEXT_PUBLIC_SUPPORT_EMAIL`.
- Support form submissions are rate limited.

## Notes

- Localhost/LAN origin cannot serve public users.
- For production traffic, always use HTTPS domain.
- `AI_PROVIDER=auto` will try OpenAI first and fall back to local logic if the model call fails.
- If Pinecone config is missing, benchmark retrieval automatically falls back to local similarity ranking.
- If `STRIPE_SECRET_KEY` is set while `DATA_BACKEND=supabase`, `SUPABASE_SERVICE_ROLE_KEY` must also be set or Stripe webhooks will return `503`.

## 11) Common Vercel Domain Errors

- `401` on `*.vercel.app`: Deployment Protection is active. Disable protection for Production or use a custom production domain.
- `404` + `X-Vercel-Error: DEPLOYMENT_NOT_FOUND`: the domain alias points to a missing/deleted deployment. Re-assign that domain in `Project -> Domains`.
