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

## 2026-10-03

- End-user manual built: `docs/user-manual.html` (editable source, brand Poppins fonts in `docs/fonts/`) → `docs/KSE-User-Manual.pdf` (~28 pp, 16 chapters, covers every shipped module incl. mess, hub, to-let, book exchange, research partners). Render via headless Chrome (see render command in file header comment region / agent memory). The older `docs/user-manual.md` remains as a developer test guide — it predates the newer modules.
- Bangla edition (2026-10-03): `docs/user-manual-bn.html` (Hind Siliguri) → `docs/KSE-User-Manual-BN.pdf` (~30 pp), chapter-for-chapter mirror of the English manual. NOTE: large Bengali Write-tool payloads fail JSON parsing — author via Bash heredoc chunks.
- Release APK delivered as `releases/KSE.apk` (v1.0.0, all 4 ABIs, ~115 MB, debug-keystore signed, points at Supabase cloud — works on any phone). Gradle confirmed the 10:57 build already contained HEAD ("mess management redesigned") via UP-TO-DATE packageRelease; no source changed since.
- Home/profile fixes (2026-10-03, later session): (1) profile-edit district SelectField was bound to the loaded `profile.district` prop, not the watched RHF value — picked districts never displayed and looked unsaved; DB write path was fine (verified on local + cloud REST). (2) Home top bar now shows `profiles.district` (not `university.location`) and hides the location chip entirely when district is NULL — "Khulna, Bangladesh" hard fallback removed. (3) Time-aware greeting removed from home (`greeting.tsx` + `lib/greeting.ts` deleted). (4) Quick Access: 8 primary tiles (Internship, Scholarship, Tuition, Community, To-Let, Student Hub, Mess, Workshops) always visible; Events + Mentor behind "See more" (COLLAPSED_VISIBLE=8, items reordered in `features/home/items.ts`). (5) Hero white-banner fix: the carousel's "render current ±1" virtualization could expose an unmounted (white) slot before a fast snap — all 6 loop slots are now always mounted (a slide is only ~12 views; the old svg-crash rationale was stale), the frame got a deterministic brand background, and slides were redesigned (kicker chip, arrow CTA, decorative circles removed, `accent` field dropped from promo-banners).
- Cloud DB drift discovered: cloud's `handle_new_user` trigger lacks the repo's `coalesce` — signup via raw REST without full_name metadata fails with 23502 (app flow sends it, so unaffected). Cloud auth emails hit `over_email_send_rate_limit` quickly (email confirmation ON). Supabase rejects `.dev` signup emails (`email_address_invalid`). Seeded `admin@kse.local` exists on cloud; profiles UPDATE incl. district verified working there (HTTP 204).
- Release APK rebuilt (2026-10-03 evening, contains commit c706e50 "fixed quick access"): `releases/KSE.apk` refreshed from `android/app/build/outputs/apk/release/app-release.apk` via `assembleRelease`. Gotchas learned: (1) `android/local.properties` now exists (`sdk.dir=C:/Users/mahmu/AppData/Local/Android/Sdk`, forward slashes — single backslashes are invalid property escapes; whole `/android` dir is gitignored). (2) System default JDK 25 breaks the build — AGP's prefab/CMake launcher JAR prints "A restricted method in java.lang.System has been called" on JDK 24+ and AGP treats that stderr as fatal (`react-native-worklets:configureCMakeRel…` fails). Build with Android Studio's JBR 21: `JAVA_HOME='C:\Program Files\Android\Android Studio\jbr' cmd //c "gradlew.bat assembleRelease"`. (3) Verify bundle freshness by grepping `android/app/build/generated/assets/react/release/index.android.bundle` with `grep -a` (binary-treated without it) — markers: cloud project id present, "Khulna, Bangladesh"/"Good Evening" absent.
- Scholarship matching simplified (2026-10-04): country/nationality rules deleted everywhere (mobile matcher + orchestrator params, `OpportunityEligibility` type, validation schema, admin Geography fieldset). Rationale: KSE is BD-only — profile country is locked "Bangladesh", profiles have NO nationality field, and the matcher's country/nationality params were never wired by any caller, so those rules always failed. DB columns `opportunity_eligibility.countries/nationalities` remain (informational seed data, preserved on upsert since the schema no longer touches them). Degree-level rule rewritten with a rank ladder (bachelor=5 ≡ undergraduate, masters=6, phd=8…): student passes while their highest education ≤ highest funded level, so a bachelor student matches a Master's scholarship (that's who it's for); fails only when already above (e.g. Masters holder vs Undergraduate scholarship → "Potential"). Cross-enum mismatch fixed too (eligibility 'undergraduate' vs education 'bachelor' could never intersect under the old exact-match). `highly_matched` match level removed entirely (type, labels, roll-up, rail filter, card tones); duplicate "Your match" heading removed from MatchPanel. Verified in app (Chevening now "Eligible" for the jsc/ssc/bachelor test user) + admin (form saves, geo columns untouched). Application tracker verified end-to-end: add → sheet → DB row (status/notes/submitted_at semantics) → profile grouped list → update to applied (single upserted row, submitted_at auto-set). Note: tracker rows are owner-only by design; the admin panel deliberately has NO applications view ("Staff don't read these — they're personal", per 20260924171619 migration). Admin dev server (:3000) points at CLOUD Supabase; mobile local testing needs the env-override server (see gotcha: user's own 8081 server also runs cloud env).

