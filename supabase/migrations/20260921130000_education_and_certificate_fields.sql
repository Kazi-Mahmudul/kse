-- Bangladesh-focused academic education + richer certificates (spec §6
-- "Profile"). Education is a first-class portfolio entity, deliberately
-- separate from user_certificates: SSC/HSC/Diploma/Degree entries are
-- qualifications with level-specific structure, while certificates cover
-- courses, training, competitions, workshops etc.
--
-- All columns are additive — existing portfolio rows stay valid.

create table if not exists public.user_education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Bangladesh education-system level (app-validated, EDUCATION_LEVELS in
  -- @kse/types): primary_psc | jsc | ssc | hsc | diploma | certificate_course
  -- | bachelor | masters | mphil | phd | other
  level text not null,
  -- School / College / Institute / University — label varies by level
  institution text not null,
  -- Education board for board-based levels (ssc/hsc/diploma): dhaka |
  -- chattogram | rajshahi | cumilla | jashore | barishal | sylhet | dinajpur
  -- | mymensingh | madrasah | technical | other
  board text,
  -- ISO country code; Bangladesh by default, international entries allowed
  country text not null default 'BD',
  -- ssc/hsc only
  study_group text,          -- science | humanities | business_studies | other
  roll_number text,          -- private (owner-only table via RLS)
  registration_number text,  -- private
  -- diploma / bachelor / masters / mphil / phd
  degree_type text,          -- bsc | bba | … | msc | mba | … | other
  program_name text,         -- "Computer Science & Engineering", diploma program…
  major text,                -- department / major / technology
  campus text,
  research_area text,        -- mphil/phd
  thesis_title text,
  supervisor text,
  -- timing + result
  start_year smallint,
  passing_year smallint,     -- expected graduation year while is_ongoing
  is_ongoing boolean not null default false,
  result_type text,          -- gpa | cgpa | percentage | division | other
  result text,               -- "5.00", "3.76", "First Class", "Awarded"…
  result_scale numeric(5,2), -- 4.00 | 5.00 | 100
  document_url text,         -- certificates-bucket storage path or external URL
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.user_education
  for each row execute function public.set_updated_at();

alter table public.user_education enable row level security;

-- Owner-only CRUD, matching the portfolio tables after the security review
-- (20260907160000): roll/registration numbers and marksheet document paths
-- stay private to the student.
create policy user_education_select_own on public.user_education
  for select to authenticated using (user_id = auth.uid());

create policy user_education_insert_own on public.user_education
  for insert to authenticated with check (user_id = auth.uid());

create policy user_education_update_own on public.user_education
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_education_delete_own on public.user_education
  for delete to authenticated using (user_id = auth.uid());

create index user_education_user_idx on public.user_education (user_id);

-- ── Certificates: category, program and credential columns ──────────────────

alter table public.user_certificates
  add column if not exists certificate_type text,
  add column if not exists program_name text,
  add column if not exists expires_on date,
  add column if not exists credential_id text,
  add column if not exists credential_url text,
  add column if not exists verification_url text,
  add column if not exists description text;
