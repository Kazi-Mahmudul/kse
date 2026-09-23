-- Community redesign (4/9): typed posts, images/links, pins, locks, counters.
--
-- Soft deletion replaces user hard-deletes: authors and moderators set
-- status = 'removed'; only the service role (admin panel) deletes rows.
-- is_pinned / comment_count / reaction_count are trigger-maintained and
-- protected from direct client writes by guard_community_post_update().

-- ── Column changes ───────────────────────────────────────────────────────────
-- Drop the policy that references is_announcement before removing the column.

drop policy if exists community_posts_insert_own on public.community_posts;

alter table public.community_posts
  add column if not exists post_type text not null default 'discussion'
    check (post_type in ('discussion', 'question', 'opportunity', 'announcement', 'poll')),
  add column if not exists image_url text,
  add column if not exists link_url text,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists is_locked boolean not null default false,
  add column if not exists comment_count integer not null default 0,
  add column if not exists reaction_count integer not null default 0;

update public.community_posts set post_type = 'announcement'
where is_announcement and post_type = 'discussion';

alter table public.community_posts drop column if exists is_announcement;

-- ── Pins ─────────────────────────────────────────────────────────────────────

create table public.community_pins (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  pinned_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id)
);

create index community_pins_community_idx on public.community_pins (community_id, created_at desc);

alter table public.community_pins enable row level security;

create policy community_pins_select on public.community_pins
  for select to authenticated using (true);

create policy community_pins_insert_announcer on public.community_pins
  for insert to authenticated with check (
    pinned_by = auth.uid()
    and public.is_community_announcer(community_pins.community_id)
    and exists (
      select 1 from public.community_posts p
      where p.id = community_pins.post_id
        and p.community_id = community_pins.community_id
        and p.status = 'active'
    )
  );

create policy community_pins_delete_announcer on public.community_pins
  for delete to authenticated using (
    public.is_community_announcer(community_pins.community_id)
  );

-- Maintained copy on the post so feeds can sort `is_pinned desc, created_at desc`
-- without a join. The guard trigger below trusts it because it flips this
-- session-local flag before updating.
create or replace function public.sync_community_post_pinned()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_post uuid := coalesce(new.post_id, old.post_id);
begin
  perform set_config('kse.internal_update', 'on', true);
  update public.community_posts p
    set is_pinned = exists (
      select 1 from public.community_pins cp where cp.post_id = v_post)
    where p.id = v_post;
  perform set_config('kse.internal_update', 'off', true);
  return null;
end $$;

create trigger sync_community_post_pinned
  after insert or delete on public.community_pins
  for each row execute function public.sync_community_post_pinned();

-- ── Guard trigger ────────────────────────────────────────────────────────────
-- RLS decides *who* may update a post; this decides *which columns*:
--   author      → content, image, link, and soft-delete (status → removed)
--   moderator   → lock/unlock and remove/restore only
--   service role / maintenance triggers → everything

create or replace function public.guard_community_post_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null
     or coalesce(current_setting('kse.internal_update', true), 'off') = 'on' then
    return new;
  end if;

  if new.community_id is distinct from old.community_id
     or new.author_id is distinct from old.author_id
     or new.post_type is distinct from old.post_type
     or new.is_pinned is distinct from old.is_pinned
     or new.comment_count is distinct from old.comment_count
     or new.reaction_count is distinct from old.reaction_count then
    raise exception 'Protected community post fields cannot be changed';
  end if;

  if new.author_id = auth.uid() then
    if new.is_locked is distinct from old.is_locked then
      raise exception 'Only community moderators can lock discussions';
    end if;
    return new;
  end if;

  if public.is_community_announcer(new.community_id) then
    if new.content is distinct from old.content
       or new.image_url is distinct from old.image_url
       or new.link_url is distinct from old.link_url then
      raise exception 'Moderators can only lock, remove or restore posts';
    end if;
    return new;
  end if;

  raise exception 'Not allowed to update this community post';
end $$;

create trigger guard_community_post_update
  before update on public.community_posts
  for each row execute function public.guard_community_post_update();

-- ── Policies ─────────────────────────────────────────────────────────────────
-- NOTE: on UPDATE, Postgres also runs SELECT policies against the *new* row,
-- so a soft delete (status → 'removed') is only possible if the SELECT policy
-- lets the author/moderator see a removed row. Feeds always filter
-- status = 'active'; the widened clause exists so status transitions can pass.

drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts
  for select to authenticated using (
    exists (
      select 1 from public.communities c
      where c.id = community_posts.community_id and c.status = 'active'
    )
    and (
      status = 'active'
      or (
        status in ('hidden', 'removed')
        and (
          author_id = auth.uid()
          or public.is_community_announcer(community_posts.community_id)
          or public.is_staff()
        )
      )
    )
  );


create policy community_posts_insert_own on public.community_posts
  for insert to authenticated with check (
    author_id = auth.uid()
    and status = 'active'
    and public.is_community_member(community_posts.community_id)
    and (
      post_type <> 'announcement'
      or public.is_community_announcer(community_posts.community_id)
    )
  );

drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own on public.community_posts
  for update to authenticated using (
    author_id = auth.uid() and status = 'active'
  ) with check (
    author_id = auth.uid() and status in ('active', 'removed')
  );

create policy community_posts_update_moderator on public.community_posts
  for update to authenticated using (
    public.is_community_announcer(community_posts.community_id)
  ) with check (
    public.is_community_announcer(community_posts.community_id)
    and status in ('active', 'hidden', 'removed')
  );

-- Replaces community_posts_delete_own: moderation history must survive, so
-- users soft-delete (update status); hard deletes go through the service role.
drop policy if exists community_posts_delete_own on public.community_posts;

-- ── Indexes for the new access patterns ─────────────────────────────────────

create index if not exists community_posts_feed_idx
  on public.community_posts (community_id, is_pinned desc, created_at desc)
  where status = 'active';
create index if not exists community_posts_trending_idx
  on public.community_posts (created_at desc)
  where status = 'active';
