# KSE Testing Guide

Living record of test infrastructure, commands, and coverage. Update whenever tests are added or the strategy changes.

## Current Status (2026-09-23)

**Step 21 (Testing) of the MVP order has not started.** No Jest/Vitest infrastructure is wired up yet — `pnpm test` currently has nothing to run in mobile/admin. The only existing test asset is `supabase/tests/rls_test.sql` (RLS permission tests, run against local Supabase).

CI (`.github/workflows/ci.yml`) already runs install/lint/typecheck/test/build — tests will gate PRs automatically once wired.

## Planned Stacks (per CLAUDE.md §29)

| Layer | Tooling |
|---|---|
| Mobile unit/component | Jest + React Native Testing Library |
| Admin unit/component | Vitest + React Testing Library |
| Database permissions | `supabase/tests/rls_test.sql` (SQL-based) |
| E2E (later) | Maestro — core mobile flows |

## Commands (once wired)

```bash
pnpm test                      # all workspaces
pnpm --filter mobile test      # Jest (mobile)
pnpm --filter admin test       # Vitest (admin)
supabase db reset              # then run rls_test.sql against local DB
```

## Critical Flows That Must Be Tested

From CLAUDE.md §29 — treat as the minimum acceptance list:

1. Registration
2. Login (email + Google)
3. Profile update
4. Opportunity listing (incl. pagination, expiry filtering)
5. Bookmark / saved opportunities
6. Admin publish workflow (draft → published)
7. RLS permissions (student vs admin vs anonymous)
8. Expired opportunity behavior

## Conventions

- Test files colocated: `*.test.ts(x)` next to the code under test.
- Prioritize `features/*/service.ts` and `packages/validation` — pure logic, highest value.
- A bug fix should come with a regression test when infra allows.
- Update the coverage table below as suites land.

## Coverage

| Area | Status |
|---|---|
| RLS / DB permissions | 🔨 partial — `supabase/tests/rls_test.sql` |
| Mobile unit/component | ⬜ none |
| Admin unit/component | ⬜ none |
| E2E (Maestro) | ⬜ deferred post-MVP |
