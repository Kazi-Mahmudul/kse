-- Community redesign (5/9): comments with one-level replies, reactions,
-- and the post counters they maintain.

-- ── Comments ─────────────────────────────────────────────────────────────────

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.community_comments(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1500),
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.community_comments
for each row execute function public.set_updated_at();

create index community_comments_post_idx
  on public.community_comments (post_id, created_at);
create index community_comments_parent_idx
  on public.community_comments (parent_id);
create index community_comments_author_idx on public.community_comments (author_id);
create index community_comments_status_idx
  on public.community_comments (status, created_at desc);

-- One-level replies only: a reply's parent must be a top-level comment
-- on the same post. Runs security definer so the parent lookup ignores RLS.
create or replace function public.guard_comment_depth()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_parent_parent uuid;
  v_parent_post uuid;
begin
  if new.parent_id is not null then
    select c.parent_id, c.post_id into v_parent_parent, v_parent_post
    from public.community_comments c where c.id = new.parent_id;

    if v_parent_post is null then
      raise exception 'Parent comment not found';
    end if;
    if v_parent_post is distinct from new.post_id then
      raise exception 'Reply parent must belong to the same post';
    end if;
    if v_parent_parent is not null then
      raise exception 'Only one level of comment replies is allowed';
    end if;
  end if;
  return new;
end $$;

create trigger guard_comment_depth
  before insert on public.community_comments
  for each row execute function public.guard_comment_depth();

-- Authors edit/soft-delete their own comments; moderators can only
-- remove/restore (status) — never rewrite someone else's words.
create or replace function public.guard_community_comment_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null
     or coalesce(current_setting('kse.internal_update', true), 'off') = 'on' then
    return new;
  end if;

  if new.post_id is distinct from old.post_id
     or new.parent_id is distinct from old.parent_id
     or new.author_id is distinct from old.author_id then
    raise exception 'Protected comment fields cannot be changed';
  end if;

  if new.author_id = auth.uid() then
    return new;
  end if;

  if new.content is distinct from old.content then
    raise exception 'Moderators can only remove or restore comments';
  end if;
  return new;
end $$;

create trigger guard_community_comment_update
  before update on public.community_comments
  for each row execute function public.guard_community_comment_update();

alter table public.community_comments enable row level security;

create policy community_comments_select on public.community_comments
  for select to authenticated using (
    exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id
        and p.status = 'active'
        and (public.is_staff() or exists (
          select 1 from public.communities c
          where c.id = p.community_id and c.status = 'active'))
    )
    and (
      status = 'active'
      or (
        status in ('hidden', 'removed')
        and (
          author_id = auth.uid()
          or exists (
            select 1 from public.community_posts p2
            where p2.id = community_comments.post_id
              and public.is_community_announcer(p2.community_id)
          )
          or public.is_staff()
        )
      )
    )
  );

create policy community_comments_insert_own on public.community_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and status = 'active'
    and exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id
        and p.status = 'active'
        and not p.is_locked
        and public.is_community_member(p.community_id)
    )
  );

create policy community_comments_update_own on public.community_comments
  for update to authenticated using (
    author_id = auth.uid() and status = 'active'
  ) with check (
    author_id = auth.uid() and status in ('active', 'removed')
  );

create policy community_comments_update_moderator on public.community_comments
  for update to authenticated using (
    exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id
        and public.is_community_announcer(p.community_id)
    )
  ) with check (
    exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id
        and public.is_community_announcer(p.community_id)
    )
    and status in ('active', 'hidden', 'removed')
  );

-- no delete policy: soft delete only, service role can hard delete

-- ── Reactions ────────────────────────────────────────────────────────────────
-- MVP ships a single 'like'; the reaction column keeps room to grow.

create table public.community_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'like' check (reaction = 'like'),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index community_reactions_user_idx on public.community_reactions (user_id);

alter table public.community_reactions enable row level security;

create policy community_reactions_select on public.community_reactions
  for select to authenticated using (true);

create policy community_reactions_insert_own on public.community_reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.community_posts p
      where p.id = community_reactions.post_id
        and p.status = 'active'
        and public.is_community_member(p.community_id)
    )
  );

create policy community_reactions_delete_own on public.community_reactions
  for delete to authenticated using (user_id = auth.uid());

-- ── Post counters ────────────────────────────────────────────────────────────

create or replace function public.sync_post_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_post uuid := coalesce(new.post_id, old.post_id);
begin
  perform set_config('kse.internal_update', 'on', true);
  update public.community_posts p
    set comment_count = (
      select count(*) from public.community_comments c
      where c.post_id = v_post and c.status = 'active')
    where p.id = v_post;
  perform set_config('kse.internal_update', 'off', true);
  return null;
end $$;

create trigger sync_post_comment_count
  after insert or delete or update of status, post_id on public.community_comments
  for each row execute function public.sync_post_comment_count();

create or replace function public.sync_post_reaction_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_post uuid := coalesce(new.post_id, old.post_id);
begin
  perform set_config('kse.internal_update', 'on', true);
  update public.community_posts p
    set reaction_count = (
      select count(*) from public.community_reactions r
      where r.post_id = v_post)
    where p.id = v_post;
  perform set_config('kse.internal_update', 'off', true);
  return null;
end $$;

create trigger sync_post_reaction_count
  after insert or delete on public.community_reactions
  for each row execute function public.sync_post_reaction_count();
