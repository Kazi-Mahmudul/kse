-- Layer 1b — spec compliance: dedicated community_reports table.
-- Spec §Database names community_reports explicitly. The earlier schema
-- added new enum values to the generic reports table; we keep that table
-- for non-community abuse and add a fresh table for community abuse so
-- the admin queue and RLS can be tightened without a destructive rewrite.
--
-- Report reasons match spec §Moderation exactly: spam, harassment,
-- inappropriate, scam, misleading, other.

create type public.community_report_reason as enum (
  'spam', 'harassment', 'inappropriate', 'scam', 'misleading', 'other'
);

-- Spec also lists 'community' as a reportable target (the community itself,
-- not a post in it). The original report_target_type enum already had
-- 'community', but the dedicated table's narrower target type keeps the
-- community queue isolated from the broader reports table.
create type public.community_report_target as enum (
  'community', 'community_post', 'community_comment', 'community_event', 'community_poll'
);

create type public.community_report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.community_report_target not null,
  target_id uuid not null,
  reason public.community_report_reason not null,
  details text check (char_length(details) <= 1000),
  status public.community_report_status not null default 'open',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index community_reports_status_idx on public.community_reports (status, created_at desc);
create index community_reports_target_idx on public.community_reports (target_type, target_id);
create index community_reports_reporter_idx on public.community_reports (reporter_id, created_at desc);

-- One open/reviewing report per (reporter, target); resolved or dismissed
-- reports never block a legitimate re-report.
create unique index community_reports_active_target_reporter_idx
  on public.community_reports (reporter_id, target_type, target_id)
  where status in ('open', 'reviewing');

alter table public.community_reports enable row level security;

-- Members of the target community (or the target community's mods) need
-- to be able to see reports against content they own. The Edge Function
-- is the writer for status transitions; client-side reads are limited.
create policy community_reports_select_reporter on public.community_reports
  for select to authenticated using (
    reporter_id = auth.uid() or public.is_staff()
  );

-- Authenticated insert: only your own row, status must start as 'open'.
-- Server-side rate limit lives in the Edge Function; this policy is the
-- last line of defence.
create policy community_reports_insert_own on public.community_reports
  for insert to authenticated with check (
    reporter_id = auth.uid() and status = 'open'
  );

-- No UPDATE / DELETE policies: status transitions are privileged
-- (Edge Function / service role); audit history is preserved by forbidding
-- any client-side delete.
