-- Tighten community_posts_insert_own: qualify every column reference in the
-- WITH CHECK expression so Postgres resolves `community_id` and
-- `is_announcement` to NEW.* rather than to a correlated subquery alias.

create or replace function public.is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_members m
    where m.community_id = p_community_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_community_announcer(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_members m
    where m.community_id = p_community_id
      and m.user_id = auth.uid()
      and m.role in ('moderator', 'owner')
  );
$$;

drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own on public.community_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'active'
    and public.is_community_member(community_posts.community_id)
    and (not is_announcement or public.is_community_announcer(community_posts.community_id))
  );

-- Same fix applied to the update policy's existence half, if needed in the
-- future. existing update policy is author-only — leave it alone for now.
