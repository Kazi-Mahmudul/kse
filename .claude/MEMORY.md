# KSE Project Memory

> **Maintenance protocol (binding for every Claude session):**
> 1. Read this file at the start of any substantive task.
> 2. Update it whenever a decision is made, a gotcha is discovered, or milestone status changes.
> 3. Never delete history — append. Keep entries dated and terse.
> 4. Do not duplicate what CLAUDE.md already defines (architecture, rules). This file records *state and learnings*, not specs.

---

## Current Status (updated 2026-09-23)

MVP steps 1–20 of CLAUDE.md §30 are **done** (repo, schema, auth, nav/design system, profile, admin auth, admin CRUD, opportunity list/detail, search, bookmark, dashboard, events, scholarships, internships, tuition, community, notifications, portfolio, analytics, security review).

Remaining:

- [ ] Step 21 — Testing (no unit-test infrastructure exists yet)
- [ ] Step 22 — Production release

See `docs/roadmap.md` for the canonical checklist — keep it in sync when steps complete.

Recent work (git log): Google login (`20260923120000_google_avatar_url.sql`), hero section banners, project showcase fields, resume file name, education/certificate fields.

## Environment Facts

- pnpm monorepo, Node ≥ 22. Package manager is pnpm 12.x.
- **pnpm 12 reads `nodeLinker` from `pnpm-workspace.yaml`, not `.npmrc`** — hoisted linker is required for Expo/Metro to resolve deps.
- `pmOnFail: ignore` in the workspace file prevents engine-switch failures on Vercel/Windows. Don't "clean this up".
- `sharp` / `unrs-resolver` build scripts are disabled workspace-wide; don't re-enable.
- Expo Claude plugin enabled via `apps/mobile/.claude/settings.json`.
- Local setup: `pnpm bootstrap` (runs `scripts/setup-local.mjs`) — starts local Supabase, applies migrations + seed.
- GitHub owner: `kazi-mahmudul`. Repo: KSE.
- **Git: Claude never pushes. User pushes himself.** Claude may commit to feature branches when asked.

## Decisions Log

| Date | Decision | Why |
|---|---|---|
| 2026-09-06 | pnpm hoisted nodeLinker for Expo compat | Metro can't resolve symlinked node_modules |
| 2026-09-23 | `.claude/` folder created (MEMORY/AGENT/SKILLS/TESTS.md) | Persistent project memory across Claude sessions |

## Gotchas & Learnings

- Feature layout convention on mobile: `src/features/<domain>/{components/, queries.ts, service.ts}` — business logic lives in `service.ts`, TanStack Query wrappers in `queries.ts`, no logic in screens.
- Migrations are timestamp-prefixed `YYYYMMDDHHMMSS_description.sql`; 24 exist as of 2026-09-23.
- `supabase/tests/rls_test.sql` holds RLS permission tests — extend it when adding user-facing tables.
- Google OAuth: only the *web client ID* is public (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`); the secret lives in the Supabase dashboard only.

## Open Questions / Next Up

- Choose and wire up Jest + React Native Testing Library for mobile, Vitest + RTL for admin (step 21).
