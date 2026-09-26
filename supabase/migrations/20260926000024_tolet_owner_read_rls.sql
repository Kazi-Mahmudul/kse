-- Bachelor To-Let — owner-read policy for own non-published listings.
--
-- Existing RLS on `opportunities` (20260906120004_opportunities.sql) has two
-- SELECT policies:
--   * `opportunities_select_published`  — anon + authenticated, status='published'
--   * `opportunities_select_staff`      — authenticated, public.is_staff()
--
-- Owners need a third path to read their own drafts / pending_review / archived
-- rows (e.g. the "My Listings" screen on mobile). Adding one narrow policy
-- keeps the staff and public paths unchanged.
--
-- This is the *only* new client-readable policy on `opportunities` for the
-- tolet feature. All writes still go through the service-role Edge Function,
-- which is the same trust model used for the community module.

create policy opportunities_select_owner_own on public.opportunities
  for select to authenticated
  using (
    created_by = auth.uid()
    and type = 'tolet'
  );
