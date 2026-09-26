-- Add a free-text `deadline_note` column to `opportunities`.
--
-- Why: many real-world scholarships and calls publish their application
-- window as prose ("Annual; check current call", "Usually Oct–Jan for the
-- next academic year", "University-specific deadlines") rather than a single
-- parseable date. Forcing these into the `deadline timestamptz` column either
-- picks an arbitrary day (and then expiry jobs wrongly hide live rows) or
-- drops the deadline to NULL (and the mobile card just hides it).
--
-- The new column carries the human-written note verbatim:
--   * `deadline` (timestamptz) is the concrete *next* apply-by date when one
--     is knowable. A scheduled expiry job marks rows `status='expired'` once
--     it passes.
--   * `deadline_note` (text) is the source-of-truth prose for everything
--     else. The mobile Scholarship card / detail page now reads it when
--     `deadline` is NULL, so students still see "Annual; check current
--     call" instead of a blank space.
--   * Both can coexist: a row with `deadline = '2027-02-01'` and
--     `deadline_note = '2026/27 cycle opened 1 Oct 2026 – 1 Feb 2027'` shows
--     the date in the card and the full window in the detail page.
--
-- Widen the search vector to include the note too — students often search
-- "varies", "annual", "university-specific", etc., and these phrases only
-- live in `deadline_note`. The GIN index is rebuilt in the same atomic step
-- so the search experience never returns stale results.
--
-- Why the drop/recreate of `search_vector` is safe (Supabase's static
-- analyzer flags this as "destructive" — see note below before running):
--   * `search_vector` is a GENERATED column whose bytes are derived from
--     `title`, `summary`, `organization_name`, `description`, `location`,
--     `country`, and now `deadline_note`. No user data is stored in the
--     column itself — Postgres recomputes it on insert/update.
--   * `public.tsvector_search(...)` is referenced ONLY by that generated
--     column. Recreating both in the same transaction re-establishes the
--     dependency cleanly. This is the same drop/recreate pattern that
--     `20260921120000_widen_opportunity_search.sql` already used in your
--     migration history.
--   * The whole block runs inside BEGIN/COMMIT, so mobile queries that read
--     `search_vector` never see the brief moment when the column doesn't
--     exist — Supabase's SQL editor would otherwise auto-commit each
--     statement independently and leave that gap open.

begin;

alter table public.opportunities
  add column if not exists deadline_note text;

comment on column public.opportunities.deadline_note is
  'Free-text deadline description for opportunities whose apply-by window is prose (e.g. "Annual; check current call"). Read when `deadline` is NULL.';

-- ── Rebuild search vector to include deadline_note (weight C) ──────────────

alter table public.opportunities drop column if exists search_vector;

drop function if exists public.tsvector_search(text, text, text, text, text, text);

create or replace function public.tsvector_search(
  title text,
  summary text,
  org text,
  description text,
  location text,
  country text,
  deadline_note text
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
      || setweight(to_tsvector('simple'::regconfig, coalesce(country, '')), 'C')
      || setweight(to_tsvector('simple'::regconfig, coalesce(deadline_note, '')), 'C');
$$;

alter table public.opportunities
  add column search_vector tsvector
  generated always as (
    public.tsvector_search(
      title, summary, organization_name, description, location, country, deadline_note
    )
  ) stored;

create index if not exists opportunities_search_idx
  on public.opportunities using gin (search_vector);

commit;
