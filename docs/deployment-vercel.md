# Production Deployment (Public Login)

## Goal

Make ViralBrain accessible to external users with stable email/Google login.

## 1) Deploy web app to public HTTPS domain

Recommended: Vercel.

- Import repo.
- Keep repository root as `./` (default) or set `apps/web`; both work with this repo.
- Root `vercel.json` forces `apps/web/package.json` to use `@vercel/next`.
- If Project Preset shows `Other`, deployment still works because `vercel.json` overrides builder selection.

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
- Redirect URL: `https://your-domain.com/auth/callback`

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
