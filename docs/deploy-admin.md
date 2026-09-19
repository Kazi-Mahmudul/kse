# Deploying the Admin Panel to Vercel

The admin panel (`apps/admin`) is a Next.js app in a pnpm workspace.
Vercel handles the monorepo via the **Root Directory** setting — no
vercel.json or build config changes needed. `pnpm-lock.yaml`,
`pnpm-workspace.yaml` and the committed `packages/*` sources at the repo
root are all it requires.

## One-time setup

1. **Vercel** → *Add New → Project* → import the `Kazi-Mahmudul/kse` GitHub repo.
2. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `apps/admin`
   - **Build Command:** leave default (`next build`)
   - **Install Command:** leave default (pnpm, version from `packageManager` in the root `package.json`)
3. **Environment Variables** (Settings → Environment Variables, add each for
   Production, Preview and Development — names exactly as below, values from
   `apps/admin/.env.example` / Supabase Dashboard → Settings → API):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://ssnrgvgmiwonmurwqqkk.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` (publishable key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` (secret key — server-only) |

   `NEXT_PUBLIC_*` values are inlined at build time, so they must exist in
   Vercel **before** the first deploy.
4. **Deploy.**

## After the first deploy

- Optional, for future OAuth/email-link flows: Supabase Dashboard →
  Authentication → URL Configuration → add the Vercel URL (e.g.
  `https://kse-admin.vercel.app`) to **Redirect URLs**. Plain email/password
  sign-in does not need this.
- Pushes to `main` auto-deploy production; every PR gets a Preview deployment.
- Admin login: `admin@kse.local` / `admin12345` (seeded staff account).

## Local equivalent

Local dev uses the same cloud project via `apps/admin/.env.local`
(copy from `.env.example`, fill the service-role key). Nothing runs
locally for production — the mobile app talks to Supabase directly, not
to the admin panel.
