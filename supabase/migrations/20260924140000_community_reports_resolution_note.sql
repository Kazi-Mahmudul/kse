-- Fix admin "Could not load reports: column community_reports.resolution_note does not exist".
--
-- The admin community-reports page selects `resolution_note` to surface
-- moderator write-ups; the original community_reports table only tracked
-- `resolved_by` / `resolved_at`. Add the missing text column so the admin
-- selector resolves against the live schema. Edge Function writers set this
-- on transition to `resolved` / `dismissed`; clients only ever read it.

alter table public.community_reports
  add column if not exists resolution_note text;
