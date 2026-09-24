-- Structured scholarship eligibility (extends the unified `opportunities`
-- table; scholarships are `type = 'scholarship'` rows, so this table is
-- 1:1 against them). One row per opportunity — null cells mean "no
-- constraint" rather than "must be zero". The mobile matching engine
-- reads this; admins edit it via the existing opportunity form.

create table public.opportunity_eligibility (
  opportunity_id uuid primary key
    references public.opportunities(id) on delete cascade,
  -- Academic
  min_cgpa numeric(4, 2),
  cgpa_scale numeric(4, 2),
  degree_levels public.degree_level[] not null default '{}',
  fields text[] not null default '{}',
  -- Geography
  countries text[] not null default '{}',
  nationalities text[] not null default '{}',
  -- English / standardised tests
  ielts_min numeric(3, 1),
  toefl_min integer,
  pte_min integer,
  gre_min integer,
  -- Activity signals (matched against user_activities + portfolio)
  requires_research boolean not null default false,
  requires_publication boolean not null default false,
  requires_work_experience boolean not null default false,
  requires_project_experience boolean not null default false,
  requires_leadership boolean not null default false,
  requires_extracurricular boolean not null default false,
  requires_test_score boolean not null default false,
  -- Required documents / extras (free text; admin-authored).
  required_documents text[] not null default '{}',
  other_requirements text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.opportunity_eligibility
  for each row execute function public.set_updated_at();

alter table public.opportunity_eligibility enable row level security;

-- Reads piggy-back on the parent opportunity's RLS: only published rows
-- (or staff) can see the eligibility. The mobile matching Edge Function
-- runs with the caller's JWT, so this stays narrow.
create policy opportunity_eligibility_select_published
  on public.opportunity_eligibility
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id
        and o.status = 'published'
        and (o.published_at is null or o.published_at <= now())
    )
  );

create policy opportunity_eligibility_select_staff
  on public.opportunity_eligibility
  for select to authenticated
  using (public.is_staff());

-- Writes go through the service-role client after the admin action
-- verifies the staff role; no client-side insert/update policy is added
-- on purpose (matches the existing opportunities-table convention).
