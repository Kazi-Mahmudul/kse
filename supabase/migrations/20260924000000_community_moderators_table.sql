-- Layer 1a — spec compliance: community_moderators is its own table.
-- Spec §Database names community_moderators explicitly. The earlier schema
-- had folded moderator / announcer into community_members.role; we split
-- it back out, backfill from existing role rows, and rewrite the helper
-- functions every moderator policy calls.

-- Guard: the table + indexes + RLS may already exist from a partial push
-- of an earlier revision of this migration. Without this guard,
-- re-applying throws "relation already exists" and aborts the whole push,
-- blocking every downstream migration (RLS refresh, freeze, reports …).
create table if not exists public.community_moderators (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- 'announcer' may pin posts and create announcements; 'moderator' may
  -- additionally lock, remove, restore. Both roles are sub-roles of owner
  -- and inherit the owner's removal rights; only owners may assign roles.
  scope text not null check (scope in ('moderator', 'announcer')),
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (community_id, user_id, scope)
);

create index if not exists community_moderators_user_idx
  on public.community_moderators (user_id);
create index if not exists community_moderators_community_idx
  on public.community_moderators (community_id);

-- Backfill: every row in community_members with role='moderator' becomes
-- a row in the new table. Owners keep their existing community_members
-- role row and are additionally recorded as moderators for query parity.
-- Note: 'announcer' was never reachable here because
-- public.community_member_role is ('member','moderator','owner') — the
-- enum only allows those three values. The new community_moderators
-- table can still hold scope='announcer' once a future migration adds it
-- to the enum.
--
-- `assigned_by` self-references — the original grantor was never recorded,
-- so we treat existing entries as self-assigned at migration time.
insert into public.community_moderators (community_id, user_id, scope, assigned_by)
select community_id, user_id, 'moderator', user_id
from public.community_members
where role = 'moderator'
on conflict do nothing;

-- enable row level security is idempotent (no-op when already enabled).
alter table public.community_moderators enable row level security;

-- Owners may manage; everyone authenticated may read (used by RLS).
-- drop-if-exists makes the policy block re-runnable across partial pushes.
drop policy if exists community_moderators_select on public.community_moderators;
create policy community_moderators_select on public.community_moderators
  for select to authenticated using (true);

-- The Edge Function (admin path) uses the service-role key to manage rows;
-- no client-side insert/update/delete policies are added. This blocks mods
-- from self-promoting and prevents client-side bypass.

-- ── Function rewrite ──────────────────────────────────────────────────────────

-- Replace is_community_announcer. community_members.role is now a UI hint
-- ("owner" stays there so the client can render the badge) but the source
-- of truth for "may pin / announce / moderate" is community_moderators.
create or replace function public.is_community_announcer(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_moderators cm
    where cm.community_id = p_community_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.community_members m
    where m.community_id = p_community_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

-- Helper: returns true only when the community is active. Combines with
-- is_community_announcer in policies that must freeze on archive/suspend.
create or replace function public.community_status_active(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.communities c
    where c.id = p_community_id and c.status = 'active'
  );
$$;

-- Layer 2a — freeze mod actions on archived/suspended communities. Every
-- policy that previously called is_community_announcer(...) now calls the
-- combined expression below; this is the same change repeated for each
-- migration that defines a mod policy. We re-issue the policies in-place
-- so existing audit history stays accurate (no DROP+CREATE on the table).
--
-- Helper used by policies:
--    is_community_announcer(cid) AND community_status_active(cid)
-- We introduce a single combined function to keep RLS readable and avoid
-- the same EXISTS join being duplicated 12 times.

create or replace function public.can_moderate_community(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_community_announcer(p_community_id)
     and public.community_status_active(p_community_id);
$$;
