-- Tuition / tutor discovery (spec §6 "Tuition"). Discovery + contact/request
-- workflow only — no marketplace payments.

create table public.tutors (
  id uuid primary key references auth.users(id) on delete cascade,
  headline text not null default '',
  bio text,
  university_id uuid references public.universities(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  location text,
  expected_fee_min numeric(10, 0),
  expected_fee_max numeric(10, 0),
  availability text,
  is_verified boolean not null default false,
  status public.content_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tutor_subjects (
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (tutor_id, subject_id)
);

create table public.tuition_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  tutor_id uuid references public.tutors(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  message text not null,
  preferred_time text,
  status public.tuition_request_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tutor_id is not null or subject_id is not null)
);

create trigger set_updated_at before update on public.tutors
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.tuition_requests
  for each row execute function public.set_updated_at();

-- Tutors may not self-verify; verification is an admin action.
create or replace function public.protect_tutor_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.is_verified is distinct from old.is_verified then
    raise exception 'Tutors: is_verified may not be changed by the owner';
  end if;
  return new;
end;
$$;

create trigger protect_tutor_columns before update on public.tutors
  for each row execute function public.protect_tutor_columns();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.tutors enable row level security;
alter table public.tutor_subjects enable row level security;
alter table public.tuition_requests enable row level security;

-- Verified, active tutor profiles are browsable; owners always see their own.
create policy tutors_select_verified on public.tutors
  for select to authenticated
  using (
    (is_verified and status = 'active')
    or id = auth.uid()
    or public.is_staff()
  );

-- Creating/updating your own tutor profile requires the tutor role.
create policy tutors_insert_own on public.tutors
  for insert to authenticated
  with check (id = auth.uid() and public.has_role('tutor'));

create policy tutors_update_own on public.tutors
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and public.has_role('tutor'));

create policy tutor_subjects_select on public.tutor_subjects
  for select to authenticated
  using (true);

create policy tutor_subjects_write_own on public.tutor_subjects
  for all to authenticated
  using (tutor_id = auth.uid())
  with check (tutor_id = auth.uid());

-- Students see their sent requests; tutors see requests addressed to them.
create policy tuition_requests_select_involved on public.tuition_requests
  for select to authenticated
  using (student_id = auth.uid() or tutor_id = auth.uid() or public.is_staff());

create policy tuition_requests_insert_own on public.tuition_requests
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and (tutor_id is null or exists (
      select 1 from public.tutors t
      where t.id = tutor_id and t.is_verified and t.status = 'active'
    ))
  );

-- Either party may update (student edits/closes, tutor responds).
create policy tuition_requests_update_involved on public.tuition_requests
  for update to authenticated
  using (student_id = auth.uid() or tutor_id = auth.uid())
  with check (student_id = auth.uid() or tutor_id = auth.uid());

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index tutors_university_idx on public.tutors (university_id)
  where is_verified and status = 'active';
create index tutors_location_idx on public.tutors (location)
  where is_verified and status = 'active';
create index tutor_subjects_subject_idx on public.tutor_subjects (subject_id);
create index tuition_requests_student_idx on public.tuition_requests (student_id);
create index tuition_requests_tutor_idx on public.tuition_requests (tutor_id);
