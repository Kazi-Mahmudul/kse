-- Enums and shared helper functions.
-- Enum values mirror @kse/types (packages/types/src) exactly.

-- ── Enums ───────────────────────────────────────────────────────────────────

create type public.opportunity_type as enum (
  'internship', 'scholarship', 'workshop', 'event', 'mentorship'
);

-- Content workflow statuses (spec §21).
create type public.opportunity_status as enum (
  'draft', 'pending_review', 'published', 'rejected', 'expired', 'archived'
);

create type public.opportunity_mode as enum ('remote', 'onsite', 'hybrid');

create type public.user_role as enum (
  'student', 'tutor', 'mentor', 'content_manager', 'admin', 'super_admin'
);

create type public.academic_level as enum (
  'undergraduate', 'postgraduate', 'hsc', 'ssc', 'other'
);

create type public.profile_status as enum ('active', 'suspended');

-- Moderation state for community-generated content.
create type public.content_status as enum ('active', 'hidden', 'removed');

create type public.tuition_request_status as enum (
  'pending', 'accepted', 'rejected', 'closed'
);

create type public.mentorship_request_status as enum (
  'pending', 'accepted', 'rejected', 'closed'
);

create type public.community_member_role as enum ('member', 'moderator', 'owner');

create type public.notification_type as enum (
  'deadline_reminder', 'new_opportunity', 'event_upcoming',
  'community_announcement', 'platform_announcement', 'custom'
);

create type public.delivery_channel as enum ('in_app', 'push', 'email');

create type public.delivery_status as enum ('pending', 'sent', 'failed');

create type public.report_target_type as enum (
  'opportunity', 'tutor', 'mentor', 'community_post', 'community', 'user'
);

create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create type public.event_registration_status as enum ('registered', 'cancelled');

-- ── Helper functions ────────────────────────────────────────────────────────

-- Keeps updated_at current. Attach per table (see bottom of each migration).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role check helpers (has_role / is_staff) live in
-- 20260906120003_profiles_and_roles.sql, after user_roles exists.
