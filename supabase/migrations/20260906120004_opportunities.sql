-- Opportunities (spec §8): one table with a `type` discriminator instead of
-- per-subtype tables. Events/workshops are opportunities of type event/workshop;
-- event_registrations models the student-facing registration action.

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  type public.opportunity_type not null,
  title text not null,
  organization_name text not null,
  summary text,
  description text,
  image_url text,
  location text,
  opportunity_mode public.opportunity_mode,
  eligibility text,
  application_url text,
  deadline timestamptz,
  category_id uuid references public.opportunity_categories(id) on delete set null,
  published_at timestamptz,
  status public.opportunity_status not null default 'draft',
  featured boolean not null default false,
  verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  source_name text,
  source_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_tags (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (opportunity_id, tag_id)
);

create table public.saved_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

create table public.event_registrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status public.event_registration_status not null default 'registered',
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

-- ── Full-text search (spec §16) ─────────────────────────────────────────────
-- 'simple' dictionary: content mixes English/Bangla, so no English stemming.
-- Wrapping to_tsvector in an IMMUTABLE function lets it back a stored
-- generated column that Postgres maintains automatically on insert/update.

create or replace function public.tsvector_simple(title text, summary text, org text)
returns tsvector
language sql
immutable
as $$
  select setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A')
      || setweight(to_tsvector('simple'::regconfig, coalesce(summary, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(org, '')), 'B');
$$;

alter table public.opportunities
  add column search_vector tsvector
  generated always as (
    public.tsvector_simple(title, summary, organization_name)
  ) stored;

create trigger set_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.event_registrations
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.opportunities enable row level security;
alter table public.opportunity_tags enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.event_registrations enable row level security;

-- Published opportunities are public content (spec §10).
create policy opportunities_select_published on public.opportunities
  for select to anon, authenticated
  using (
    status = 'published'
    and (published_at is null or published_at <= now())
  );

-- Staff may read every workflow state through the authenticated key;
-- all writes go through the service-role client regardless.
create policy opportunities_select_staff on public.opportunities
  for select to authenticated
  using (public.is_staff());

create policy opportunity_tags_select_published on public.opportunity_tags
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id
        and o.status = 'published'
        and (o.published_at is null or o.published_at <= now())
    )
  );

create policy saved_opportunities_all_own on public.saved_opportunities
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy event_registrations_select_own on public.event_registrations
  for select to authenticated
  using (user_id = auth.uid());

create policy event_registrations_insert_own on public.event_registrations
  for insert to authenticated
  with check (user_id = auth.uid());

create policy event_registrations_update_own on public.event_registrations
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index opportunities_status_idx on public.opportunities (status);
create index opportunities_type_status_idx on public.opportunities (type, status);
create index opportunities_deadline_idx on public.opportunities (deadline)
  where status = 'published';
create index opportunities_published_at_idx on public.opportunities (published_at desc)
  where status = 'published';
create index opportunities_featured_idx on public.opportunities (featured)
  where status = 'published' and featured;
create index opportunities_organization_idx on public.opportunities (organization_name);
create index opportunities_search_idx on public.opportunities using gin (search_vector);
create index saved_opportunities_user_idx on public.saved_opportunities (user_id);
create index event_registrations_opportunity_idx on public.event_registrations (opportunity_id);
