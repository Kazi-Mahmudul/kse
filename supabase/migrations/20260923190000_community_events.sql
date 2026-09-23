-- Community redesign (7/9): community events and RSVPs.
-- Separate from the opportunities table: these belong to a community, are
-- created by its moderators/owner, and never appear in Explore listings.

create table public.community_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 150),
  description text check (char_length(description) between 0 and 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  mode text not null default 'offline' check (mode in ('online', 'offline', 'hybrid')),
  meeting_url text,
  organizer text,
  image_url text,
  created_by uuid references auth.users(id) on delete set null,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create trigger set_updated_at before update on public.community_events
for each row execute function public.set_updated_at();

create index community_events_community_idx
  on public.community_events (community_id, starts_at);
create index community_events_upcoming_idx
  on public.community_events (starts_at)
  where status = 'active';
create index community_events_status_idx
  on public.community_events (status, created_at desc);

-- Moderators may edit event details but not move an event between
-- communities or forge the creator.
create or replace function public.guard_community_event_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.community_id is distinct from old.community_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Protected event fields cannot be changed';
  end if;
  return new;
end $$;

create trigger guard_community_event_update
  before update on public.community_events
  for each row execute function public.guard_community_event_update();

alter table public.community_events enable row level security;

-- Removed/hidden rows stay visible to announcers and staff so their soft
-- delete / restore updates pass the SELECT-policy check on the new row.
create policy community_events_select on public.community_events
  for select to authenticated using (
    (
      status = 'active'
      or public.is_community_announcer(community_events.community_id)
      or public.is_staff()
    )
    and exists (
      select 1 from public.communities c
      where c.id = community_events.community_id and c.status = 'active'
    )
  );

create policy community_events_select_staff on public.community_events
  for select to authenticated using (public.is_staff());

create policy community_events_insert_announcer on public.community_events
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.is_community_announcer(community_events.community_id)
  );

create policy community_events_update_announcer on public.community_events
  for update to authenticated using (
    public.is_community_announcer(community_events.community_id)
  ) with check (
    public.is_community_announcer(community_events.community_id)
  );

-- no delete policy: soft delete (status) only; service role hard-deletes

-- ── RSVPs ────────────────────────────────────────────────────────────────────

create table public.community_event_attendees (
  event_id uuid not null references public.community_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rsvp text not null default 'attending' check (rsvp in ('interested', 'attending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create trigger set_updated_at before update on public.community_event_attendees
for each row execute function public.set_updated_at();

create index community_event_attendees_user_idx
  on public.community_event_attendees (user_id, updated_at desc);

alter table public.community_event_attendees enable row level security;

create policy community_event_attendees_select on public.community_event_attendees
  for select to authenticated using (true);

create policy community_event_attendees_insert_own on public.community_event_attendees
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.community_events e
      where e.id = community_event_attendees.event_id
        and e.status = 'active'
        and public.is_community_member(e.community_id)
    )
  );

create policy community_event_attendees_update_own on public.community_event_attendees
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy community_event_attendees_delete_own on public.community_event_attendees
  for delete to authenticated using (user_id = auth.uid());