-- Tutor applications + reviews/ratings (spec §6 "Tuition", §7 "Tuition
-- Management"). Students apply as tutors from their profile; staff review in
-- the admin portal, where approval (service role) creates the verified
-- `tutors` row and grants the tutor role. Reviews are public, writable by the
-- reviewer, removable by reviewer / reviewed tutor / staff (CLAUDE.md §5).

-- ── Tutor applications ───────────────────────────────────────────────────────

create type public.tutor_application_status as enum ('pending', 'approved', 'rejected');

create table public.tutor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  headline text not null,
  bio text,
  university_id uuid references public.universities(id) on delete set null,
  location text,
  expected_fee_min numeric(10, 0),
  expected_fee_max numeric(10, 0),
  availability text,
  status public.tutor_application_status not null default 'pending',
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tutor_application_subjects (
  application_id uuid not null references public.tutor_applications(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (application_id, subject_id)
);

create trigger set_updated_at before update on public.tutor_applications
  for each row execute function public.set_updated_at();

-- One open application per student (DB-enforced; the form also checks).
create unique index tutor_applications_one_open_idx
  on public.tutor_applications (user_id)
  where status = 'pending';

-- ── Tutor reviews + aggregate rating ─────────────────────────────────────────

create table public.tutor_reviews (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tutor_id, reviewer_id)
);

create trigger set_updated_at before update on public.tutor_reviews
  for each row execute function public.set_updated_at();

-- Denormalised aggregates on tutors, kept in sync by trigger so the discovery
-- list shows ratings without a per-tutor review query.
alter table public.tutors
  add column rating_avg numeric(3, 2) not null default 0,
  add column rating_count integer not null default 0;

create or replace function public.refresh_tutor_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tutor uuid := coalesce(new.tutor_id, old.tutor_id);
begin
  update public.tutors t
  set rating_avg = coalesce((
        select round(avg(r.rating), 2)
        from public.tutor_reviews r
        where r.tutor_id = v_tutor
      ), 0),
      rating_count = (
        select count(*)
        from public.tutor_reviews r
        where r.tutor_id = v_tutor
      )
  where t.id = v_tutor;
  return null;
end;
$$;

create trigger tutor_reviews_refresh_rating
  after insert or update or delete on public.tutor_reviews
  for each row execute function public.refresh_tutor_rating();

-- ── Saved tutors (bookmark on the discovery cards) ───────────────────────────

create table public.saved_tutors (
  user_id uuid not null references auth.users(id) on delete cascade,
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tutor_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.tutor_applications enable row level security;
alter table public.tutor_application_subjects enable row level security;
alter table public.tutor_reviews enable row level security;
alter table public.saved_tutors enable row level security;

-- Applicants see their own submissions; staff see all for review.
create policy tutor_applications_select_involved on public.tutor_applications
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- Students may apply unless they already are a verified tutor.
create policy tutor_applications_insert_own on public.tutor_applications
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (
      select 1 from public.tutors t
      where t.id = auth.uid() and t.is_verified
    )
  );

-- Review decisions are staff-only (the admin portal also uses the service
-- role, which bypasses RLS; this covers staff-authenticated sessions).
create policy tutor_applications_update_staff on public.tutor_applications
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy tutor_application_subjects_select_involved
  on public.tutor_application_subjects
  for select to authenticated
  using (exists (
    select 1 from public.tutor_applications a
    where a.id = application_id
      and (a.user_id = auth.uid() or public.is_staff())
  ));

create policy tutor_application_subjects_insert_own
  on public.tutor_application_subjects
  for insert to authenticated
  with check (exists (
    select 1 from public.tutor_applications a
    where a.id = application_id
      and a.user_id = auth.uid()
      and a.status = 'pending'
  ));

-- Reviews are public read for all authenticated users (shown on the tutor
-- profile); writes are restricted below.
create policy tutor_reviews_select on public.tutor_reviews
  for select to authenticated
  using (true);

-- Any signed-in student except the tutor themself may review (unique
-- (tutor_id, reviewer_id) enforces one review per tutor).
create policy tutor_reviews_insert_own on public.tutor_reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and reviewer_id <> tutor_id
    and exists (
      select 1 from public.tutors t
      where t.id = tutor_id and t.is_verified and t.status = 'active'
    )
  );

-- The reviewer edits their own review; staff can moderate content.
create policy tutor_reviews_update_own on public.tutor_reviews
  for update to authenticated
  using (reviewer_id = auth.uid() or public.is_staff())
  with check (reviewer_id = auth.uid() or public.is_staff());

-- Reviewer, the reviewed tutor, or staff may remove a review.
create policy tutor_reviews_delete_involved on public.tutor_reviews
  for delete to authenticated
  using (
    reviewer_id = auth.uid()
    or tutor_id = auth.uid()
    or public.is_staff()
  );

create policy saved_tutors_select_own on public.saved_tutors
  for select to authenticated
  using (user_id = auth.uid());

create policy saved_tutors_insert_own on public.saved_tutors
  for insert to authenticated
  with check (user_id = auth.uid());

create policy saved_tutors_delete_own on public.saved_tutors
  for delete to authenticated
  using (user_id = auth.uid());

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index tutor_applications_status_idx
  on public.tutor_applications (status, created_at desc);
create index tutor_applications_user_idx on public.tutor_applications (user_id);
create index tutor_reviews_tutor_idx
  on public.tutor_reviews (tutor_id, created_at desc);
create index saved_tutors_tutor_idx on public.saved_tutors (tutor_id);
