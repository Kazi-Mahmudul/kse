-- Student activities (volunteering, leadership, debate, sports, cultural,
-- social work, club, competition, other). Scholarship eligibility can
-- require extracurricular involvement — this table is the source of
-- truth for those signals.

create type public.user_activity_type as enum (
  'volunteering',
  'leadership',
  'debate',
  'sports',
  'cultural',
  'social_work',
  'club',
  'competition',
  'other'
);

create table public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type public.user_activity_type not null,
  title text not null,
  organization text,
  role text,
  start_date date,
  end_date date,
  is_ongoing boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.user_activities
  for each row execute function public.set_updated_at();

create index user_activities_user_idx on public.user_activities (user_id);
create index user_activities_type_idx on public.user_activities (activity_type);

alter table public.user_activities enable row level security;

-- Owner-only CRUD. Activities are personal portfolio items so the
-- existing portfolio convention (owner read for the mobile matching
-- engine) applies.
create policy user_activities_select_own on public.user_activities
  for select to authenticated using (user_id = auth.uid());

create policy user_activities_insert_own on public.user_activities
  for insert to authenticated with check (user_id = auth.uid());

create policy user_activities_update_own on public.user_activities
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_activities_delete_own on public.user_activities
  for delete to authenticated using (user_id = auth.uid());
