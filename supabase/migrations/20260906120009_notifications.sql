-- Notifications (spec §18): Expo Push + in-app inbox. Rows are created by
-- trusted contexts (service role / Edge Functions), never by clients.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  opportunity_id uuid references public.opportunities(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel public.delivery_channel not null,
  status public.delivery_status not null default 'pending',
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

-- Recipients may only mark read/unread — no content edits.
create or replace function public.protect_notification_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (new.type is distinct from old.type
          or new.title is distinct from old.title
          or new.body is distinct from old.body
          or new.data is distinct from old.data
          or new.opportunity_id is distinct from old.opportunity_id
          or new.user_id is distinct from old.user_id) then
    raise exception 'Notifications: content may not be changed by the recipient';
  end if;
  return new;
end;
$$;

create trigger protect_notification_content before update on public.notifications
  for each row execute function public.protect_notification_content();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notification_deliveries_select_own on public.notification_deliveries
  for select to authenticated
  using (
    exists (
      select 1 from public.notifications n
      where n.id = notification_id and n.user_id = auth.uid()
    )
  );

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id)
  where read_at is null;
create index notification_deliveries_notification_idx on public.notification_deliveries (notification_id);
