-- ── Mentor Profile & Discussion Management ────────────────────────────────────
-- 1. Add cover_image_url to opportunities
-- 2. Allow approved mentors to update their own opportunity profile
-- 3. Allow approved mentors to insert, update, and delete their discussions
-- 4. Allow public select for mentor_discussion_comments and add profiles foreign key
-- 5. Allow approved mentors to update session status on mentorship_requests
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Cover photo on opportunities
alter table public.opportunities
  add column if not exists cover_image_url text;

-- Also on mentor_applications for record keeping
alter table public.mentor_applications
  add column if not exists avatar_url text,
  add column if not exists cover_image_url text;

-- 2. Allow approved mentors to update their opportunity profile
drop policy if exists opportunities_mentor_update on public.opportunities;
create policy opportunities_mentor_update on public.opportunities
  for update to authenticated
  using (
    exists (
      select 1 from public.mentor_applications ma
      where ma.opportunity_id = opportunities.id
        and ma.user_id = auth.uid()
        and ma.status = 'approved'
    )
    or created_by = auth.uid()
    or public.is_staff()
  )
  with check (
    exists (
      select 1 from public.mentor_applications ma
      where ma.opportunity_id = opportunities.id
        and ma.user_id = auth.uid()
        and ma.status = 'approved'
    )
    or created_by = auth.uid()
    or public.is_staff()
  );

-- 3. Discussions CRUD for approved mentors
drop policy if exists mentor_discussions_insert on public.mentor_discussions;
create policy mentor_discussions_insert on public.mentor_discussions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.mentor_applications ma
      where ma.opportunity_id = mentor_discussions.opportunity_id
        and ma.user_id = auth.uid()
        and ma.status = 'approved'
    )
    or public.is_staff()
  );

drop policy if exists mentor_discussions_update on public.mentor_discussions;
create policy mentor_discussions_update on public.mentor_discussions
  for update to authenticated
  using (
    exists (
      select 1 from public.mentor_applications ma
      where ma.opportunity_id = mentor_discussions.opportunity_id
        and ma.user_id = auth.uid()
        and ma.status = 'approved'
    )
    or public.is_staff()
  )
  with check (
    exists (
      select 1 from public.mentor_applications ma
      where ma.opportunity_id = mentor_discussions.opportunity_id
        and ma.user_id = auth.uid()
        and ma.status = 'approved'
    )
    or public.is_staff()
  );

drop policy if exists mentor_discussions_delete on public.mentor_discussions;
create policy mentor_discussions_delete on public.mentor_discussions
  for delete to authenticated
  using (
    exists (
      select 1 from public.mentor_applications ma
      where ma.opportunity_id = mentor_discussions.opportunity_id
        and ma.user_id = auth.uid()
        and ma.status = 'approved'
    )
    or public.is_staff()
  );

-- 4. Discussion comments: allow anon/authenticated reads and foreign key to profiles
drop policy if exists mentor_discussion_comments_select on public.mentor_discussion_comments;
create policy mentor_discussion_comments_select on public.mentor_discussion_comments
  for select to anon, authenticated using (true);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'mentor_discussion_comments_user_id_profiles_fk'
  ) then
    alter table public.mentor_discussion_comments
      add constraint mentor_discussion_comments_user_id_profiles_fk
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
exception when others then
  null;
end $$;

-- 5. Mentorship requests session management for approved mentors
drop policy if exists mentorship_requests_update_involved on public.mentorship_requests;
create policy mentorship_requests_update_involved on public.mentorship_requests
  for update to authenticated
  using (
    student_id = auth.uid()
    or mentor_id = auth.uid()
    or exists (
      select 1 from public.mentor_applications ma
      where ma.opportunity_id = mentorship_requests.opportunity_id
        and ma.user_id = auth.uid()
        and ma.status = 'approved'
    )
    or public.is_staff()
  )
  with check (
    student_id = auth.uid()
    or mentor_id = auth.uid()
    or exists (
      select 1 from public.mentor_applications ma
      where ma.opportunity_id = mentorship_requests.opportunity_id
        and ma.user_id = auth.uid()
        and ma.status = 'approved'
    )
    or public.is_staff()
  );
