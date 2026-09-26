-- Bachelor To-Let — extend notification_type with five tolet-specific events.
--
-- Each value drives the inbox template on the mobile app
-- (apps/mobile/src/app/(tabs)/notifications.tsx → NOTIFICATION_TYPE_LABELS):
--   * tolet_submitted        — student posted a listing; goes to staff
--   * tolet_approved         — staff approved; goes to the listing owner
--   * tolet_rejected         — staff rejected; goes to the listing owner
--   * tolet_reported         — a student reported this listing; goes to staff
--   * tolet_status_changed   — landlord marked almost_full/full/unavailable; goes
--                              to anyone who saved the listing
--
-- Five ADD VALUEs in one file is safe: `add value if not exists` is idempotent
-- and Postgres permits multiple `add value` calls in the same migration.
-- Combining with other DDL is not (the ALTER TYPE implicitly commits), so this
-- file is its own migration.

alter type public.notification_type add value if not exists 'tolet_submitted';
alter type public.notification_type add value if not exists 'tolet_approved';
alter type public.notification_type add value if not exists 'tolet_rejected';
alter type public.notification_type add value if not exists 'tolet_reported';
alter type public.notification_type add value if not exists 'tolet_status_changed';
