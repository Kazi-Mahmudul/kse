-- Event-hub fields (spec 08._events_kse):
--   * `event_type` — sub-typing for events (workshop | seminar | hackathon | meetup).
--                    Drives the All / Workshop / Seminar / Hackathon quick chips.
--   * `starts_at` — when the event happens (separate from `deadline`, which is
--                    the apply/register cutoff on the existing `opportunities` row).
--
-- Nullable on `public.opportunities` — other opportunity types leave them empty.

alter table public.opportunities
  add column if not exists event_type text,
  add column if not exists starts_at timestamptz;

-- Validate `event_type` to the four spec chips + a `meetup` bucket for the
-- community meetups already present in seed data. App-level enum lives in
-- `packages/types/src/opportunity.ts` (`EventType`).
do $do$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_event_type_check'
  ) then
    alter table public.opportunities
      add constraint opportunities_event_type_check
      check (
        event_type is null
        or event_type in ('workshop', 'seminar', 'hackathon', 'meetup')
      );
  end if;
end $do$;

-- Speeds up the chip filter `.eq('event_type', …)` on the Events Hub.
create index if not exists opportunities_event_type_idx
  on public.opportunities (event_type)
  where type in ('event', 'workshop') and event_type is not null;

-- Speeds up the event-aware ordering by `starts_at` ascending in
-- `fetchOpportunities` when `filters.type in ('event', 'workshop')`.
create index if not exists opportunities_starts_at_idx
  on public.opportunities (starts_at)
  where type in ('event', 'workshop');

-- Backfill existing event/workshop rows so the Events Hub has data to render
-- after the migration. Real values come from the admin portal afterward;
-- the backfill is purely for verify / first-run.
update public.opportunities
  set
    event_type = coalesce(
      event_type,
      case when type = 'workshop' then 'workshop' else 'meetup' end
    ),
    starts_at = coalesce(
      starts_at,
      created_at + interval '7 days'
    )
  where type in ('event', 'workshop');

comment on column public.opportunities.event_type is
  'Event sub-type: workshop | seminar | hackathon | meetup. Spec 08._events_kse chips.';
comment on column public.opportunities.starts_at is
  'When the event happens. Distinct from `deadline`, which is the apply/register cutoff.';
