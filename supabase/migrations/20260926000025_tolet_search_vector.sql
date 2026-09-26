-- Bachelor To-Let — extend search vector with city / area + description.
--
-- The To-Let hub search is heavily location-driven ("near KUET", "Dattapara",
-- "boy's mess in Sonadanga"). The existing `search_vector` already indexes
-- `location` and `country` (weights C), but To-Let rows store the structured
-- city/area pair in dedicated columns. Pulling them in at weight B matches the
-- importance students give to neighbourhood when choosing a room.
--
-- Same drop/recreate + BEGIN/COMMIT pattern as
-- 20260926000011_opportunities_deadline_note.sql — the generated column drops
-- atomically with its dependency function so reads never see a window where
-- the column doesn't exist.
--
-- Why the additional arguments don't break existing callers:
--   * `public.tsvector_search` is referenced ONLY by the generated column.
--   * No other migration or RPC calls this function directly.
--   * The new (city, area) args are at the end → all existing signatures
--     remain compatible.

begin;

alter table public.opportunities drop column if exists search_vector;

drop function if exists public.tsvector_search(text, text, text, text, text, text);

create or replace function public.tsvector_search(
  title text,
  summary text,
  org text,
  description text,
  location text,
  country text,
  city text,
  area text
)
returns tsvector
language sql
immutable
as $$
  select setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A')
      || setweight(to_tsvector('simple'::regconfig, coalesce(org, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(summary, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(city, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(area, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')
      || setweight(to_tsvector('simple'::regconfig, coalesce(location, '')), 'C')
      || setweight(to_tsvector('simple'::regconfig, coalesce(country, '')), 'C');
$$;

alter table public.opportunities
  add column search_vector tsvector
  generated always as (
    public.tsvector_search(
      title, summary, organization_name, description, location, country, city, area
    )
  ) stored;

-- Re-create the GIN index. The original migration also used `if not exists`,
-- so re-running this file on a DB that already has the index is a no-op.
create index if not exists opportunities_search_idx
  on public.opportunities using gin (search_vector);

commit;
