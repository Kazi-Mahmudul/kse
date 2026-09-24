-- Student test scores (IELTS / TOEFL / PTE / GRE / Duolingo / OET / TOEIC /
-- MET / MOI / other). Drives the scholarship eligibility check: an English
-- test minimum is meaningless if the student hasn't recorded a score.
-- One row per test attempt.

create type public.test_score_type as enum (
  'ielts',
  'toefl',
  'pte',
  'gre',
  'duolingo',
  'oet',
  'toeic',
  'met',
  'moi',
  'other'
);

create table public.user_test_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_type public.test_score_type not null,
  -- Free-form text so we can hold "7.5", "320", "115/120", "B2" etc.
  score text not null,
  test_date date,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.user_test_scores
  for each row execute function public.set_updated_at();

create index user_test_scores_user_idx on public.user_test_scores (user_id);
create index user_test_scores_type_idx on public.user_test_scores (test_type);

alter table public.user_test_scores enable row level security;

-- Owner-only CRUD; the scholarship matching engine runs as the caller
-- so it only ever sees the student's own rows.
create policy user_test_scores_select_own on public.user_test_scores
  for select to authenticated using (user_id = auth.uid());

create policy user_test_scores_insert_own on public.user_test_scores
  for insert to authenticated with check (user_id = auth.uid());

create policy user_test_scores_update_own on public.user_test_scores
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_test_scores_delete_own on public.user_test_scores
  for delete to authenticated using (user_id = auth.uid());
