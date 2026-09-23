-- Community redesign (8/9): moderation plumbing.
-- New reportable targets, moderator member-removal, report de-duplication.
-- (Enum values added here are used only by later statements — app code and
-- tests run after all migrations — so this stays safe in one transaction.)

alter type public.report_target_type add value if not exists 'community_comment';
alter type public.report_target_type add value if not exists 'community_event';
alter type public.report_target_type add value if not exists 'community_poll';

-- Moderators can remove plain members; anyone (except owners) can leave.
-- Owners must transfer or ask an admin — a community cannot be orphaned.
drop policy if exists community_members_delete_own on public.community_members;
create policy community_members_delete_own on public.community_members
  for delete to authenticated using (
    (user_id = auth.uid() and community_members.role in ('member', 'moderator'))
    or (
      public.is_community_announcer(community_members.community_id)
      and community_members.role = 'member'
    )
  );

-- One open/reviewing report per (reporter, target); resolved or dismissed
-- reports never block a legitimate re-report.
create unique index if not exists reports_active_target_reporter_idx
  on public.reports (reporter_id, target_type, target_id)
  where status in ('open', 'reviewing');
