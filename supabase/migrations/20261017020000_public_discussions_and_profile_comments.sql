-- ── Allow public reads on mentor discussions and profiles for comments ────────
-- Also reload PostgREST schema cache

drop policy if exists mentor_discussions_select on public.mentor_discussions;
create policy mentor_discussions_select on public.mentor_discussions
  for select to anon, authenticated
  using (true);

drop policy if exists mentor_discussion_comments_select on public.mentor_discussion_comments;
create policy mentor_discussion_comments_select on public.mentor_discussion_comments
  for select to anon, authenticated
  using (true);

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
  for select to anon
  using (true);

-- Ensure schema cache is fresh
notify pgrst, 'reload schema';
