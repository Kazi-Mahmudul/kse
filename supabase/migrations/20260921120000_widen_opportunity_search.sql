-- Widen the opportunity full-text search vector (spec §16 search quality).
--
-- The original vector indexed only title / summary / organization_name, so
-- free-text searches for a location ("Khulna"), a country ("Bangladesh") or a
-- phrase that only appears in the description never matched anything. The
-- mobile search screen now also uses prefix matching (`fts` + `:*` tokens),
-- which the same GIN index serves.
--
-- Weights keep title > organization/summary > everything else so ranking
-- stays sensible once the mobile client orders by relevance.

alter table public.opportunities drop column search_vector;

drop function public.tsvector_simple(text, text, text);

create or replace function public.tsvector_search(
  title text,
  summary text,
  org text,
  description text,
  location text,
  country text
)
returns tsvector
language sql
immutable
as $$
  select setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A')
      || setweight(to_tsvector('simple'::regconfig, coalesce(org, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(summary, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')
      || setweight(to_tsvector('simple'::regconfig, coalesce(location, '')), 'C')
      || setweight(to_tsvector('simple'::regconfig, coalesce(country, '')), 'C');
$$;

alter table public.opportunities
  add column search_vector tsvector
  generated always as (
    public.tsvector_search(
      title, summary, organization_name, description, location, country
    )
  ) stored;

-- The drop above removed the old GIN index with the column; rebuild it.
create index opportunities_search_idx on public.opportunities using gin (search_vector);
