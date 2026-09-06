-- Mentorship (spec §6, §7). Same discovery + request shape as tuition.

create table public.mentors (
  id uuid primary key references auth.users(id) on delete cascade,
  headline text not null default '',
  current_position text,
  organization text,
  bio text,
  experience_years smallint,
  availability text,
  is_verified boolean not null default false,
  status public.content_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mentor_skills (
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (mentor_id, skill_id)
);

create table public.mentorship_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  topic text not null,
  message text not null,
  status public.mentorship_request_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.mentors
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.mentorship_requests
  for each row execute function public.set_updated_at();

create or replace function public.protect_mentor_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.is_verified is distinct from old.is_verified then
    raise exception 'Mentors: is_verified may not be changed by the owner';
  end if;
  return new;
end;
$$;

create trigger protect_mentor_columns before update on public.mentors
  for each row execute function public.protect_mentor_columns();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.mentors enable row level security;
alter table public.mentor_skills enable row level security;
alter table public.mentorship_requests enable row level security;

create policy mentors_select_verified on public.mentors
  for select to authenticated
  using (
    (is_verified and status = 'active')
    or id = auth.uid()
    or public.is_staff()
  );

create policy mentors_insert_own on public.mentors
  for insert to authenticated
  with check (id = auth.uid() and public.has_role('mentor'));

create policy mentors_update_own on public.mentors
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and public.has_role('mentor'));

create policy mentor_skills_select on public.mentor_skills
  for select to authenticated
  using (true);

create policy mentor_skills_write_own on public.mentor_skills
  for all to authenticated
  using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid());

create policy mentorship_requests_select_involved on public.mentorship_requests
  for select to authenticated
  using (student_id = auth.uid() or mentor_id = auth.uid() or public.is_staff());

create policy mentorship_requests_insert_own on public.mentorship_requests
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.mentors m
      where m.id = mentor_id and m.is_verified and m.status = 'active'
    )
  );

create policy mentorship_requests_update_involved on public.mentorship_requests
  for update to authenticated
  using (student_id = auth.uid() or mentor_id = auth.uid())
  with check (student_id = auth.uid() or mentor_id = auth.uid());

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index mentor_skills_skill_idx on public.mentor_skills (skill_id);
create index mentorship_requests_student_idx on public.mentorship_requests (student_id);
create index mentorship_requests_mentor_idx on public.mentorship_requests (mentor_id);
