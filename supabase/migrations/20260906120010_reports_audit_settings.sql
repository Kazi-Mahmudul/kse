-- Reports (user-flagged content), audit logs (admin actions, service-only),
-- app settings (spec §7).

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,          -- create | update | delete | approve | suspend | role_change
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');

create policy reports_select_own on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_staff());

-- audit_logs: RLS enabled with no policies — visible only to the service role.

-- App settings are readable by all clients (feature flags, maintenance mode…);
-- written by admins through the service-role client.
create policy app_settings_select_public on public.app_settings
  for select to anon, authenticated
  using (true);

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
