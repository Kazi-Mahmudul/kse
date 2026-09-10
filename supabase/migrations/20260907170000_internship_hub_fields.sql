-- Internship-specific structured filters (spec 06._internship_hub_kse):
-- internship type (full_time/part_time/contract/unpaid) and a paired
-- stipend amount + 3-letter ISO currency code. Nullable on the existing
-- `public.opportunities` table — other opportunity types leave them empty.

do $do$ begin
  if not exists (select 1 from pg_type where typname = 'opportunity_internship_type') then
    create type public.opportunity_internship_type
      as enum ('full_time', 'part_time', 'contract', 'unpaid');
  end if;
end $do$;

alter table public.opportunities
  add column if not exists stipend_amount   numeric(10,2),
  add column if not exists stipend_currency text
    check (stipend_currency is null or stipend_currency ~ '^[A-Z]{3}$'),
  add column if not exists internship_type  public.opportunity_internship_type;

-- Stipend columns must be set together: either both null or both populated.
do $do$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_stipend_pair_chk'
  ) then
    alter table public.opportunities
      add constraint opportunities_stipend_pair_chk
      check (
        (stipend_amount is null and stipend_currency is null) or
        (stipend_amount is not null and stipend_currency is not null)
      );
  end if;
end $do$;

-- Speeds up the "Part-time" / "Full-time" / "Contract" / "Unpaid" chip filter
-- on the Internship Hub screen.
create index if not exists opportunities_internship_type_idx
  on public.opportunities (internship_type)
  where type = 'internship' and internship_type is not null;

comment on column public.opportunities.stipend_amount is
  'Monthly stipend amount (mainly internships, spec 06._internship_hub_kse)';
comment on column public.opportunities.stipend_currency is
  'ISO-4217 currency code for stipend_amount (e.g. BDT, USD)';
comment on column public.opportunities.internship_type is
  'Engagement type for internships: full_time | part_time | contract | unpaid';
