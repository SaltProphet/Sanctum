# Vercel deployment checklist for Sanctum

This checklist aligns Vercel project settings with the current app configuration.

## 1) Framework preset and production branch

- **Framework Preset:** `Next.js`
- **Production Branch:** set to your canonical branch (typically `main` in hosted repos)

## 2) Build/output/runtime settings

Use the following values in Vercel Project Settings:

- **Install Command:** `npm install`
- **Build Command:** `npm run build`
- **Output Directory:** leave empty for Next.js projects (Vercel auto-detects)
- **Node.js Version:** `20.x`

Repository defaults now pin Node 20:

- `.nvmrc` contains `20`
- `package.json` engines require `20.x`

## 3) Root directory (monorepo safety check)

This repository is a single app with `package.json` at repo root.

- **Root Directory in Vercel should be:** project root (`.`)
- Do **not** point Vercel at a subdirectory for this repo.

## 4) Environment variables (Preview vs Production)

Ensure the following are set in both Preview and Production where needed:

- `DAILY_API_KEY` (server API routes)
- `VERIFF_WEBHOOK_SECRET` (Veriff webhook validation)
- `PAYMENT_WEBHOOK_SECRET` / `PAYMENTS_WEBHOOK_SECRET` (payment webhook validation)
- `NEXT_PUBLIC_DAILY_DOMAIN` (client Daily domain)
- Optional toggles used by feature/test paths:
  - `NEXT_PUBLIC_CREATOR_ONBOARDING_STATUS`
  - `VERIFICATION_MOCK_STATE`
  - `PAYMENT_MOCK_STATE`
  - `WATERMARK_HASH_SECRET`

If routing/base URLs differ by environment, verify their values are environment-specific and that Preview values do not leak into Production.

## 5) Clean redeploy and SHA verification

After correcting settings:

1. In Vercel Deployments, trigger **Redeploy** with **Use existing Build Cache = off** (clean redeploy).
2. Open the new deployment and confirm the displayed commit SHA matches:

```bash
git rev-parse HEAD
```

3. Verify deployment log shows Node `20.x` and Next.js build running `npm run build`.
