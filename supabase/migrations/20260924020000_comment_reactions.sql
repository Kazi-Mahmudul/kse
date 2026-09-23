-- Layer 1d — spec compliance: comment reactions.
-- Spec §Posts lists "likes/reactions, comments, one-level comment replies".
-- The previous schema had reactions on posts only. We add comment_id as a
-- nullable sibling with a CHECK that exactly one of post_id / comment_id
-- is set, the same primary-key constraint, and matching RLS.

alter table public.community_reactions
  add column if not exists comment_id uuid
    references public.community_comments(id) on delete cascade;

-- Replace the PK so the unique-per-target invariant becomes per-target.
-- Two reactions on (post A, like) and (comment B, like) by the same user
-- are allowed; two reactions on the same target by the same user are not.
alter table public.community_reactions drop constraint if exists community_reactions_pkey;
alter table public.community_reactions add constraint community_reactions_pkey
  primary key (post_id, user_id);

-- For comment_id we need a separate unique index because a single PK can
-- only span one nullable target column cleanly. The CHECK below guarantees
-- exactly one is set, so this index never overlaps.
create unique index if not exists community_reactions_comment_unique
  on public.community_reactions (comment_id, user_id);

-- Exactly-one-target constraint (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'community_reactions_one_target'
  ) then
    alter table public.community_reactions
      add constraint community_reactions_one_target
      check (
        (post_id is not null and comment_id is null)
        or (post_id is null and comment_id is not null)
      );
  end if;
end $$;

create index if not exists community_reactions_comment_idx
  on public.community_reactions (comment_id);

-- ── RLS: mirror the post-reaction policies for the comment target ───────────

drop policy if exists community_reactions_insert_own on public.community_reactions;
create policy community_reactions_insert_own on public.community_reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and (
      (post_id is not null and exists (
        select 1 from public.community_posts p
        where p.id = community_reactions.post_id
          and p.status = 'active'
          and public.is_community_member(p.community_id)
      ))
      or
      (comment_id is not null and exists (
        select 1 from public.community_comments c
        join public.community_posts p on p.id = c.post_id
        where c.id = community_reactions.comment_id
          and c.status = 'active'
          and p.status = 'active'
          and public.is_community_member(p.community_id)
      ))
    )
  );

-- ── Trigger to keep community_comments.reaction_count in sync ───────────────
-- The original sync_post_reaction_count trigger only fires on (post_id);
-- post_id is non-null in that case so we add a separate trigger for the
-- comment_id column that mirrors to a new community_comments.reaction_count.

alter table public.community_comments
  add column if not exists reaction_count integer not null default 0;

create or replace function public.sync_comment_reaction_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_comment uuid := coalesce(new.comment_id, old.comment_id);
begin
  perform set_config('kse.internal_update', 'on', true);
  update public.community_comments c
    set reaction_count = (
      select count(*) from public.community_reactions r
      where r.comment_id = v_comment)
    where c.id = v_comment;
  perform set_config('kse.internal_update', 'off', true);
  return null;
end $$;

create trigger sync_comment_reaction_count
  after insert or delete on public.community_reactions
  for each row execute function public.sync_comment_reaction_count();
