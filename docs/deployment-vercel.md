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

## 3) Configure Supabase Auth URLs

In Supabase Dashboard -> Auth -> URL Configuration:

- Site URL: `https://your-domain.com`
- Redirect URLs:
  - `https://your-domain.com/auth/callback`
  - `https://your-domain.com/auth/confirm`

If you have preview domains, add each callback URL explicitly.

## 4) Provider setup

In Supabase Dashboard -> Auth -> Providers:

- Enable Email
- Enable Google OAuth

For Google OAuth, ensure Google console redirect URI matches Supabase provider requirements.

## 5) Run deployment check

Before going live, run locally inside `apps/web`:

```bash
npm run deploy:check
```

This checks required env vars and warns for localhost/private/non-HTTPS callback origins.

## 6) Verify end-to-end

- Open `https://your-domain.com/login`
- Confirm callback preview shows your public domain
- Test Email Magic Link on mobile network (not your localhost)
- Confirm redirect to `/dashboard`
- Run one analysis and open report detail

## Notes

- Localhost/LAN origin cannot serve public users.
- For production traffic, always use HTTPS domain.

## 7) Common Vercel Domain Errors

- `401` on `*.vercel.app`: Deployment Protection is active. Disable protection for Production or use a custom production domain.
- `404` + `X-Vercel-Error: DEPLOYMENT_NOT_FOUND`: the domain alias points to a missing/deleted deployment. Re-assign that domain in `Project -> Domains`.

