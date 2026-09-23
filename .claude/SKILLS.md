# KSE Skills & Playbooks

Repeatable workflows for this repo. Follow these instead of improvising. Add a new playbook here whenever a workflow is done for the second time.

## S1 — Add a Mobile Screen/Feature

1. Route file: `apps/mobile/src/app/(tabs)/...` (or `(auth)/` for unauthenticated). Screen = layout + composition only.
2. Feature module: `src/features/<domain>/`
   - `service.ts` — Supabase queries / business logic
   - `queries.ts` — TanStack Query hooks wrapping service calls
   - `components/` — screen-specific UI
3. Shared UI → `src/components/ui/`; reuse before creating.
4. Types from `@kse/types`; form validation from `@kse/validation` (Zod + React Hook Form).
5. Include loading / empty / error states.
6. `pnpm --filter mobile lint && pnpm --filter mobile typecheck`.

## S2 — Add an Admin CRUD Module

1. Page under `apps/admin/src/app/(dashboard)/<module>/`.
2. Logic in `src/features/<module>/` — server-side Supabase access via `src/lib/supabase` (privileged ops server-side only).
3. Use existing components first: `confirm-submit`, `status-badge`, `sidebar-nav`, `page-placeholder`. Tables: TanStack Table. Forms: RHF + Zod.
4. Content follows the status workflow: `draft → pending_review → published → expired/archived`.
5. Register navigation in `sidebar-nav` and roles in `src/lib/roles.ts` if access is restricted.

## S3 — Database Migration

1. New file `supabase/migrations/YYYYMMDDHHMMSS_description.sql` (never edit applied migrations).
2. Include: tables (`id uuid`, `created_at`, `updated_at`, `created_by`, `status` where applicable), indexes for frequent filters, RLS policies for user-facing tables.
3. Prefer extending `opportunities` with fields/columns over new subtype tables (CLAUDE.md §8).
4. Add RLS cases to `supabase/tests/rls_test.sql`.
5. Apply locally: `pnpm bootstrap` or `supabase db reset`; verify with `supabase db diff` if unsure.
6. Update `packages/types` to mirror schema changes.

## S4 — Add an Edge Function

1. `supabase/functions/<name>/index.ts` (Deno). Use for: notifications, admin bulk actions, protected workflows, rate-limited actions, external APIs.
2. Secrets via `supabase secrets set` (Upstash, Resend, Expo access token) — never in code.
3. Rate-limit sensitive endpoints with Upstash (limits in CLAUDE.md §12).
4. Never ship responses that leak user fields beyond what the screen needs.

## S5 — Run Locally / Verify

- `pnpm bootstrap` — Supabase local stack + migrations + seed.
- `pnpm --filter mobile start` — Expo (Android/iOS/web).
- `pnpm --filter admin dev` — Admin panel on Vercel-compatible Next dev server.
- Use the `verify` skill to confirm a change works in the running app.

## S6 — Finish a Work Item

1. `pnpm lint && pnpm typecheck` (+ `pnpm test` once infra exists).
2. Update `.claude/MEMORY.md` (status/decisions/gotchas), `.claude/TESTS.md` if tests changed, `docs/roadmap.md` if a milestone step completed.
3. Commit on `feature/*` or `fix/*` branch with a conventional message. Do not push — user pushes.

## Claude Code Skills Useful Here

| Skill | Use for |
|---|---|
| `code-review` | Review the diff before finishing a feature branch |
| `simplify` | Cleanup pass after larger features |
| `verify` | Confirm changes in the running app |
| `security-review` | Before touching auth/RLS/storage/uploads |
| Expo plugin (`apps/mobile/.claude/settings.json`) | Expo-specific guidance in mobile work |
