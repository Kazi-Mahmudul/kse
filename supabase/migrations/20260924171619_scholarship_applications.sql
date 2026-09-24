-- Scholarship application tracker. Students manually mark their progress
-- against an opportunity (a `type='scholarship'` row) through a fixed
-- lifecycle. Independent of `saved_opportunities`: saving is "I might
-- apply"; this table tracks what the student is actually doing.

create type public.scholarship_application_status as enum (
  'saved',
  'interested',
  'preparing',
  'applied',
  'rejected',
  'selected'
);

create table public.scholarship_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status public.scholarship_application_status not null default 'interested',
  notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One tracker row per (student, opportunity). Status can change; the
  -- current status is just the value in `status`.
  unique (user_id, opportunity_id)
);

create trigger set_updated_at before update on public.scholarship_applications
  for each row execute function public.set_updated_at();

create index scholarship_applications_user_idx on public.scholarship_applications (user_id);
create index scholarship_applications_opportunity_idx
  on public.scholarship_applications (opportunity_id);
create index scholarship_applications_status_idx
  on public.scholarship_applications (user_id, status);

alter table public.scholarship_applications enable row level security;

-- Owner-only CRUD. Staff don't read these — they're personal.
create policy scholarship_applications_select_own
  on public.scholarship_applications
  for select to authenticated using (user_id = auth.uid());

create policy scholarship_applications_insert_own
  on public.scholarship_applications
  for insert to authenticated
  with check (user_id = auth.uid());

create policy scholarship_applications_update_own
  on public.scholarship_applications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy scholarship_applications_delete_own
  on public.scholarship_applications
  for delete to authenticated using (user_id = auth.uid());
