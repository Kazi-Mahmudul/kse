-- Dynamic education institution directory (Khulna + future districts).
-- Replaces the hardcoded institution picker in the mobile Add-Education form
-- with a single normalized reference table that admins manage through the
-- admin panel. Students can read active rows; writes are staff-only.
--
-- All other portfolio writes continue to work — `user_education.institution`
-- stays as a free-text display snapshot, and we add `institution_id` /
-- `district` columns additively so legacy rows remain valid.

-- ── Enums ───────────────────────────────────────────────────────────────────

create type public.education_institution_type as enum (
  'university',
  'medical_college',
  'college',
  'school',
  'madrasa',
  'igv_school',
  'technical_school',
  'english_medium',
  'arts_college',
  'polytechnic',
  'military_school'
);

create type public.education_institution_ownership as enum ('public', 'private', 'other');

create type public.education_institution_request_status as enum ('pending', 'approved', 'rejected');

-- Trigram index used for substring search ("খুলনা", "university of …")
create extension if not exists pg_trgm;

-- ── education_institutions ──────────────────────────────────────────────────

create table public.education_institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_bn text,
  type public.education_institution_type not null,
  ownership_type public.education_institution_ownership not null default 'other',
  city text,
  area text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Soft-delete is the rule (CLAUDE.md §7): students already referencing an
-- institution must keep seeing their old education entry, so we never
-- hard-delete a row from this table — admins flip is_active = false instead.
-- The partial unique index prevents duplicate seeding by name + district +
-- type (case-insensitive on name) so re-running the seed migration is safe.
create unique index education_institutions_unique_active
  on public.education_institutions (lower(name), coalesce(city, ''), type)
  where is_active = true;

create trigger set_updated_at before update on public.education_institutions
  for each row execute function public.set_updated_at();

create index education_institutions_type_idx
  on public.education_institutions (type);
create index education_institutions_ownership_idx
  on public.education_institutions (ownership_type);
create index education_institutions_city_idx
  on public.education_institutions (city);
create index education_institutions_active_idx
  on public.education_institutions (is_active);
create index education_institutions_name_trgm_idx
  on public.education_institutions using gin (name gin_trgm_ops);
create index education_institutions_name_bn_trgm_idx
  on public.education_institutions using gin (name_bn gin_trgm_ops);

-- RLS
alter table public.education_institutions enable row level security;

-- Public reference data: students + anon can read active institutions. Staff
-- can also see inactive rows (so the admin table can list and reactivate
-- them). Non-staff never get to see inactive rows.
create policy education_institutions_select_active_or_staff
  on public.education_institutions
  for select to anon, authenticated
  using (is_active or public.is_staff());

-- Writes are staff-only (the mobile app must never insert/update/delete an
-- institution directly — students submit a request instead, see below).
create policy education_institutions_insert_staff
  on public.education_institutions
  for insert to authenticated
  with check (public.is_staff());

create policy education_institutions_update_staff
  on public.education_institutions
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- No delete policy on purpose: deactivate instead of hard-deleting.

-- ── education_institution_requests ──────────────────────────────────────────

create table public.education_institution_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  name_bn text check (char_length(name_bn) <= 200),
  type public.education_institution_type not null,
  ownership_type public.education_institution_ownership,
  city text check (char_length(city) <= 80),
  area text check (char_length(area) <= 120),
  status public.education_institution_request_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.education_institution_requests
  for each row execute function public.set_updated_at();

create index education_institution_requests_status_idx
  on public.education_institution_requests (status, created_at desc);
create index education_institution_requests_requester_idx
  on public.education_institution_requests (requested_by, created_at desc);

alter table public.education_institution_requests enable row level security;

-- Students see their own requests; staff see all.
create policy education_institution_requests_select_own_or_staff
  on public.education_institution_requests
  for select to authenticated
  using (requested_by = auth.uid() or public.is_staff());

-- Students can submit a request — status must default to 'pending' (set on
-- insert by the client + enforced by the column default + the with-check
-- guard below so a client can't sneak in 'approved').
create policy education_institution_requests_insert_own_pending
  on public.education_institution_requests
  for insert to authenticated
  with check (requested_by = auth.uid() and status = 'pending');

-- Staff reviews (approve/reject + set reviewed_by/notes). Students cannot
-- edit or delete their own request once submitted.
create policy education_institution_requests_update_staff
  on public.education_institution_requests
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ── user_education: additive institution_id + district ──────────────────────

-- Existing rows stay valid (institution_id is nullable). New writes prefer
-- setting institution_id + snapshotting the institution name into
-- `institution` so historical education entries keep rendering even when an
-- institution is later deactivated.
alter table public.user_education
  add column if not exists institution_id uuid
    references public.education_institutions(id) on delete set null;

alter table public.user_education
  add column if not exists district text
    check (char_length(district) <= 40);

create index user_education_institution_idx
  on public.user_education (institution_id);
