-- Scholarship-specific structured filters (spec §6): degree level,
-- funding type, country. Nullable columns on opportunities rather than
-- a subtype table (spec §8) — other types simply leave them empty.

create type public.degree_level as enum ('undergraduate', 'masters', 'phd', 'diploma');

create type public.funding_type as enum ('full', 'partial', 'tuition_waiver', 'stipend');

alter table public.opportunities
  add column degree_level public.degree_level,
  add column funding_type public.funding_type,
  add column country text;

comment on column public.opportunities.degree_level is
  'Minimum/eligible study level (mainly scholarships, spec §6)';
comment on column public.opportunities.funding_type is
  'Funding coverage (mainly scholarships, spec §6)';
comment on column public.opportunities.country is
  'Country of the opportunity when it matters (scholarships abroad, spec §6)';
