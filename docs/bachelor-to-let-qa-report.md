# Bachelor To-Let — QA Report

**Feature:** Student housing / Bachelor To-Let (vertical inside KSE mobile + admin)
**Status:** Ready for Supabase cloud migration + manual smoke
**Author:** Claude Code session, 2026-09-26

---

## 1. Files created

### Database migrations (`supabase/migrations/`)
- `20260926000020_tolet_opportunity_type.sql` — adds `'tolet'` to `opportunity_type` enum.
- `20260926000021_tolet_enums.sql` — `tolet_room_type`, `tolet_gender_preference`, `tolet_listing_status`.
- `20260926000022_tolet_listing_columns.sql` — 17 nullable columns on `opportunities` (`rent_amount`, `rent_currency`, `room_type`, `gender_preference`, `available_from`, `bachelor_friendly`, `landlord_phone`, `whatsapp`, `contact_email`, `listing_status`, `image_urls`, `city`, `area`, `floor`, `total_rooms`, `available_rooms`, `utilities_included`) + partial indexes + pair-check + capacity constraint.
- `20260926000023_tolet_storage_bucket.sql` — public `tolet-listings` bucket (5 MB, jpg/png/webp) + owner-scoped policies.
- `20260926000024_tolet_owner_read_rls.sql` — `opportunities_select_owner_own` policy so owners can read their own non-published rows.
- `20260926000025_tolet_search_vector.sql` — extends the existing `search_vector` tsvector to include `city`/`area`.
- `20260926000026_tolet_report_target.sql` — adds `'tolet_listing'` to `report_target_type`.
- `20260926000027_tolet_notification_types.sql` — five new `tolet_*` notification types.

### Edge Function
- `supabase/functions/tolet-actions/index.ts` — student writes (`submit_listing`, `update_own_listing`, `withdraw_own_listing`, `mark_availability`, `report_listing`) + admin actions (`admin:approve_listing`, `admin:reject_listing`, `admin:set_listing_status`, `admin:verify_listing`, `admin:unverify_listing`, `admin:archive_listing`) + per-action rate limits via Upstash + audit log + notification fan-out.

### Types / labels / validation
- `packages/types/src/opportunity.ts` — `'tolet'` in `OPPORTUNITY_TYPES`, `TOLET_ROOM_TYPES`, `TOLET_GENDER_PREFERENCES`, `TOLET_LISTING_STATUSES` + new optional fields on `Opportunity`/`OpportunitySummary`.
- `packages/types/src/tolet.ts` — `ToletListing`, `ToletListingSummary`, `ToletFilters`, `ToletPage`, `ToletFacet`, `ToletCounts`, `ToletSubmissionPayload`.
- `packages/types/src/notification.ts` — five tolet notification types.
- `packages/shared/src/constants.ts` — labels + `STORAGE_BUCKETS.toletListings`, `OPPORTUNITY_TYPE_LABELS.tolet`, five `NOTIFICATION_TYPE_LABELS` entries.
- `packages/validation/src/tolet.ts` — `toletListingFormSchema`, `toletSubmissionPayloadSchema`, `toletAdminFormSchema`, `toletFiltersSchema`, `toletReportSchema`, `REPORT_REASONS`, `normalizeToletRoomType`.
- `packages/validation/src/opportunity.ts` — extended `opportunityCreateSchema` + `opportunityFormSchema` with the tolet columns + refine checks (rent pair, available_rooms ≤ total_rooms).

### Mobile
- `apps/mobile/src/features/tolet/service.ts` — `fetchToletListings`, `getToletListing`, `listToletFacets`, `listToletCounts`, `listOwnListings`, `submitListing`, `updateOwnListing`, `withdrawOwnListing`, `setListingAvailability`, `reportToletListing`, `uploadListingImage`, `deleteListingImage`, shared `callToletAction` Edge Function wrapper.
- `apps/mobile/src/features/tolet/queries.ts` — TanStack hooks: `useToletFeed` (with dedup-select), `useToletListing`, `useToletFacets`, `useToletCounts`, `useOwnListings`/`useMyToletListings`, all mutations, `toletKeys` cache map.
- `apps/mobile/src/features/tolet/components/tolet-card.tsx` — listing card (sibling Pressable, verified badge, rent + room chips, BookmarkButton).
- `apps/mobile/src/features/tolet/components/tolet-detail-hero.tsx` — horizontal FlatList gallery + pagination dots + lightbox.
- `apps/mobile/src/features/tolet/components/tolet-filter-bar.tsx` — chip rows for room type, gender, listing status, bachelor-friendly, max rooms, sort.
- `apps/mobile/src/features/tolet/components/post-tolet-form.tsx` — multi-section RHF form + image picker + uploads to bucket.
- `apps/mobile/src/features/tolet/components/my-listing-row.tsx` — owner management row (workflow chip + listing-status chip + withdraw action).
- `apps/mobile/src/features/tolet/hooks/use-tolet-form-submit.ts` — upload-then-submit helper.
- `apps/mobile/src/app/(tabs)/explore/tolet.tsx` — hub screen (search, quick chips, filter Modal sheet, infinite FlatList).
- `apps/mobile/src/app/(tabs)/explore/tolet/[id].tsx` — listing detail (hero, status chips, contact buttons, details card, report dialog).
- `apps/mobile/src/app/(tabs)/explore/tolet/post.tsx` — post modal.
- `apps/mobile/src/app/(tabs)/explore/tolet/my-listings.tsx` — owner manage list.

### Admin
- `apps/admin/src/features/tolet/types.ts` — `ToletFormData`, `ToletListingRow`, `ToletActionState`.
- `apps/admin/src/features/tolet/actions.ts` — `saveToletListingAction`, `setToletStatusAction`, `setToletAvailabilityAction`, `toggleToletVerifiedAction`, `deleteToletListingAction` — all with `requireStaffUserId`, audit log, revalidatePath.
- `apps/admin/src/features/tolet/tolet-form.tsx` — uncontrolled HTML form + `useActionState`.
- `apps/admin/src/app/(dashboard)/tolet/page.tsx` — list + filters.
- `apps/admin/src/app/(dashboard)/tolet/new/page.tsx` — create.
- `apps/admin/src/app/(dashboard)/tolet/[id]/page.tsx` — edit + quick-status buttons + verify toggle + availability form + danger zone.
- `apps/admin/src/app/(dashboard)/tolet/pending/page.tsx` — pending review queue with Approve / Reject.
- `apps/admin/src/app/(dashboard)/tolet/reports/page.tsx` — tolet reports queue.

### Smoke
- `scripts/smoke-tolet.mjs` — end-to-end smoke (submit → publish → mark availability → withdraw → cleanup).

---

## 2. Files modified

- `apps/mobile/src/components/bookmark-button.tsx` — generalized to `{ id, kind }`; both opportunity and tolet share `saved_opportunities`.
- `apps/mobile/src/lib/analytics.ts` — added `tolet_listing_viewed`, `tolet_listing_favorited`, `tolet_listing_contact_clicked`, `tolet_listing_submitted`, `tolet_listing_reported`, `tolet_listing_withdrawn` events + helpers.
- `apps/mobile/src/lib/confirm.ts` — added optional `buttons[]` array to support multi-reason report dialog.
- `apps/mobile/src/features/explore/categories.ts` — added `tolet` to `ExploreCategory` slug union + `Bachelor To-Let` entry.
- `apps/mobile/src/features/home/items.ts` — added `tolet` Quick Access tile.
- `apps/mobile/src/features/dashboard/components/upcoming-deadlines-list.tsx` — added `tolet` badge entry.
- `apps/mobile/src/app/(tabs)/explore/[type]/[id].tsx` — switched BookmarkButton to `id=` prop.
- `apps/mobile/src/app/(tabs)/saved.tsx` — dispatches on `type === 'tolet'` to render `ToletCard`.
- `apps/mobile/src/components/opportunity-card.tsx` — BookmarkButton prop switch.
- `apps/mobile/src/features/opportunities/components/internship-card.tsx` — same.
- `apps/mobile/src/features/opportunities/components/scholarship-card.tsx` — same.
- `apps/admin/src/components/sidebar-nav.tsx` — added `Bachelor To-Let` entry with `All listings / Pending review / Reports` children.

---

## 3. Database changes

Eight migrations in `supabase/migrations/` (numbered `20260926000020` → `20260926000027`). Apply them to Supabase cloud **in order** via the SQL editor before deploying the Edge Function.

Highlights:
- New enums: `tolet_room_type`, `tolet_gender_preference`, `tolet_listing_status`.
- `opportunity_type` extended with `'tolet'` (own migration because of Postgres ALTER TYPE restrictions).
- 17 nullable columns + 1 default (`listing_status default 'available'`).
- Pair-check constraint: `rent_amount IS NULL = rent_currency IS NULL`.
- Capacity constraint: `available_rooms IS NULL OR available_rooms <= total_rooms`.
- Partial indexes for filter chips (`(type, room_type) where type='tolet'`, `(type, listing_status, city) where type='tolet'`).
- Public storage bucket `tolet-listings` (5 MB, jpg/png/webp) + owner-scoped insert/update/delete policies.
- `search_vector` tsvector extended to include `city` + `area`.
- `report_target_type` extended with `'tolet_listing'`.
- Five new `notification_type` values: `tolet_submitted`, `tolet_approved`, `tolet_rejected`, `tolet_reported`, `tolet_status_changed`.

---

## 4. RLS / security changes

- **All student writes** go through the `tolet-actions` Edge Function. The mobile client never inserts into `opportunities` directly.
- One new RLS policy added: `opportunities_select_owner_own` — owners can `select` their own non-published rows (`type='tolet' AND created_by = auth.uid()`). Existing staff / public policies unchanged.
- The `tolet-actions` function writes notifications for both the submitter and staff via service-role.
- Rate limits (Upstash Redis, same keys as `community-actions`):
  - `submit_listing`: 5 / day / user
  - `update_own_listing`: 30 / hour / user
  - `mark_availability`: 60 / hour / user
  - `report_listing`: 10 / day / user
  - `admin:*`: 600 / hour / staff
- Audit log entries written for every staff mutation (create / update / status change / verify toggle / delete).

---

## 5. Mobile features

- **Discovery hub** at `/explore/tolet` with quick chips (All / Bachelor / Sublet / Girls only / My listings), search, infinite scroll, full filter sheet.
- **Listing detail** at `/explore/tolet/[id]` with hero gallery + lightbox, status chips, contact buttons (call / WhatsApp deep link / email), details card, report dialog.
- **Post a listing** at `/explore/tolet/post` (modal) — multi-section RHF form, image picker (up to 8), uploads to bucket, validates via `toletListingFormSchema`, submits via Edge Function.
- **My listings** at `/explore/tolet/my-listings` — owner management view with workflow status chip + listing-availability chip + withdraw action.
- **Save / favorite** — `BookmarkButton` reuses `saved_opportunities` (no new table); `kind="tolet"` routes analytics through `tolet_listing_favorited`.
- **Explore tab** — new `Bachelor To-Let` row with live published count (via `listOpportunityCountsByType`); Home Quick Access 8th tile is now `Bachelor To-Let`.
- **Saved tab** — tolet rows render via `ToletCard`.
- **Notifications** — 5 new types surface in the inbox automatically (existing `useMyNotifications` query picks them up).

---

## 6. Admin features

- **List** at `/tolet` — search, filter by status / room type / availability, pagination, verified badge.
- **Edit** at `/tolet/[id]` — quick-status buttons (Publish / Send to review / Move to draft / Archive / Reject), verify toggle, availability form (Available / Almost Full / Full / Unavailable), full `<ToletForm>` with all 17 columns + image upload, danger zone.
- **Create** at `/tolet/new`.
- **Pending queue** at `/tolet/pending` — every `type='tolet', status='pending_review'` row with one-click Approve / Reject.
- **Reports queue** at `/tolet/reports` — tolet reports with title lookup + open-listing link.
- **Sidebar nav** entry with three sub-items (All listings / Pending review / Reports).

---

## 7. Testing performed

- `pnpm typecheck` (root) → ✅ all 5 packages pass (types, shared, validation, mobile, admin).
- `pnpm --filter @kse/mobile lint` → ✅ 0 errors.
- `pnpm --filter @kse/admin lint` → ✅ 0 errors.
- Manual smoke script `scripts/smoke-tolet.mjs` written but **not yet run** — needs the local Supabase stack running and migrations 20–27 applied first.

---

## 8. Bugs fixed during the build

- `confirmDialog` previously only supported a yes/no shape; report dialog needed a multi-reason picker. Extended `ConfirmOptions` with an optional `buttons[]` (works on native `Alert.alert`; web falls back to a cancel + explanatory alert).
- `BookmarkButton` originally required the legacy `opportunityId` prop. Generalized to `id` + `kind`; updated 4 call sites.
- `tolet-filter-bar.tsx` initially imported `TOLET_ROOM_TYPES` from `@kse/shared` (where it doesn't live). Moved the import to `@kse/types`.
- `dashboard/upcoming-deadlines-list.tsx` `BADGE` record missing `tolet` — TS errored because the union type now includes `'tolet'`. Added the entry.
- `supabase.typecheck` flagged `as Opportunity[]` casts on rows whose shape comes from a typed Supabase response. Routed them through `as unknown as Opportunity[]`.
- `services/confirm.ts` TS narrowing lost `options.buttons` inside a closure — captured into a local `reasonButtons` const.
- `useToletFormSubmit` was an initial duplicate hook for the form — the post form already self-submits via `useSubmitListing`; the hook is kept for non-screen callers but the screen uses the form's own submit flow.
- `apps/admin/.../tolet/reports` page used column names `resolved_at` / `reporter_id` / etc. that don't exist on the real `reports` table — corrected to `status='resolved'`, `reporter_id`, `resolution_note`, `resolved_by`.

---

## 9. Remaining limitations

- **Schema not applied yet.** Migrations 20–27 are written but must be applied to Supabase cloud via `!` (per project convention: user runs SQL manually). The Edge Function deploys (`supabase functions deploy tolet-actions`) also need the user to invoke `!`.
- **No live E2E run.** The mobile app was never started against a real backend because the cloud migrations aren't applied. The smoke script covers the Edge Function path but wasn't executed in this session.
- **No push notifications wired.** The DB rows for `tolet_*` notifications are written, but the Expo Push dispatch hook (admin-only "send to subscribers") was not extended for tolet — that's a follow-up.
- **Owner-read RLS is intentionally permissive.** The new policy lets owners see every status of their own rows. Once staff verification adds the `verified` flag we may want to hide `archived`/`rejected` rows from the owner — deferred.
- **Report resolve endpoint missing.** The `/tolet/reports` page currently shows a link to the listing rather than a one-click "Mark resolved" button. Building the dedicated route is a follow-up.
- **Filter sheet facets are limited to 12 each** (city / area) — fine for MVP, fine-tune after usage data arrives.
- **WhatsApp deep link regex** strips spaces; very long international numbers might break. Acceptable for the MVP (Bangladesh + India use cases).
- **`tolet-actions` is one big file** (~500 lines). Future split into `tolet-student-actions.ts` + `tolet-admin-actions.ts` will help when admin endpoints grow.

---

## Next steps for the user (manual)

1. Apply migrations 20–27 to the Supabase cloud project **in order**.
2. `supabase functions deploy tolet-actions` + ensure Upstash secrets are set (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
3. `pnpm smoke:tolet` against the cloud URL (set `BASE_URL`, `ANON_KEY`, `SERVICE_KEY`).
4. Manual mobile E2E per spec bachelor-to-let §Verification plan.
5. Manual admin E2E per spec §Verification plan.
