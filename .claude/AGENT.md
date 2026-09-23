# Agent Operating Rules — KSE

Rules of engagement for any Claude/agent session in this repo. `CLAUDE.md` (repo root) is the authoritative spec — this file is the day-to-day operating procedure. When they conflict, CLAUDE.md wins.

## Session Start Checklist

1. Read `CLAUDE.md` (auto-loaded) — architecture, rules, MVP scope.
2. Read `.claude/MEMORY.md` — current status, gotchas, decisions.
3. Check `docs/roadmap.md` if the task touches milestone status.
4. Run `git status` / `git log --oneline -5` to see where things stand.

## Session End Checklist

1. Update `.claude/MEMORY.md` if: a decision was made, a gotcha was found, milestone status changed, or environment facts changed.
2. Update `.claude/TESTS.md` if tests were added/changed.
3. Update `.claude/SKILLS.md` if a new repeatable workflow emerged.
4. Update `docs/roadmap.md` when an MVP step completes.
5. Never push. Report what was committed; the user pushes.

## Repo Layout

```text
apps/mobile    Expo + Expo Router + TS (screens in src/app, logic in src/features/<domain>)
apps/admin     Next.js App Router + Tailwind + shadcn/ui (src/app, src/features)
packages/      shared / types / validation (@kse/*)
supabase/      migrations/ (timestamp-prefixed .sql), functions/, tests/rls_test.sql, seed/
docs/          architecture, roadmap, SPEC, deploy, user-manual
scripts/       setup-local.mjs (bootstrap)
```

## Non-Negotiable Invariants

- Never use `service_role` key or secrets in `apps/mobile` or any client code.
- All schema changes via new migration file in `supabase/migrations/` — never edit an applied migration.
- Every new user-facing table gets RLS policies + coverage in `supabase/tests/rls_test.sql`.
- Validate all form inputs with Zod (packages/validation where shared).
- TypeScript strict mode; no `any` unless unavoidable.
- No new dependency without justification (CLAUDE.md §25.1).
- No raw SQL string building; no secrets committed; no client-trusted roles.

## Where Code Goes

| Kind | Location |
|---|---|
| Screen/route | `apps/mobile/src/app/**` (thin — layout + composition only) |
| Business logic | `src/features/<domain>/service.ts` |
| Server-state hooks | `src/features/<domain>/queries.ts` (TanStack Query) |
| Local/UI state | `src/store/**` (Zustand, keep minimal) |
| Shared types / zod schemas | `packages/types`, `packages/validation` |
| Admin pages | `apps/admin/src/app/(dashboard)/**`, logic in `src/features/<domain>` |
| Privileged logic | Supabase Edge Function (`supabase/functions/`), not the client |

Every user-facing screen needs loading, empty, and error states (CLAUDE.md §37).

## Commands

Run from repo root unless noted:

```bash
pnpm bootstrap        # one-time local setup: Supabase + migrations + seed
pnpm lint             # all workspaces
pnpm typecheck        # all workspaces
pnpm test             # all workspaces (see .claude/TESTS.md — infra pending)
pnpm --filter mobile start    # Expo dev server
pnpm --filter admin dev      # Next.js dev server
```

Always run `pnpm lint` and `pnpm typecheck` before reporting work done.

## Git

- Branch from `main` as `feature/<name>` or `fix/<name>`.
- Small, conventional commits (`feat:`, `fix:`, `chore:`, `docs:` …).
- PRs to `main` even as a solo dev; CI (`.github/workflows/ci.yml`) runs install/lint/typecheck/test/build.
- **Never `git push`** — the user pushes. Never force-push, never rewrite `main`.
