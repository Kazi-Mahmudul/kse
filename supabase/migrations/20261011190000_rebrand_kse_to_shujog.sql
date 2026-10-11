-- Rebrand data touchpoints: KSE → Shujog (2026-10-11 rename).
--
-- Two user-visible strings live in the database:
--   1. profiles.full_name 'KSE Admin' — the staff account shown as the
--      author of admin-sent notifications and community announcements.
--   2. opportunities.source_name 'KSE Mentor Network' — attribution shown
--      on seeded mentor detail pages.
-- Purely textual; ids, roles and references are untouched.

update public.profiles
set full_name = 'Shujog Admin', updated_at = now()
where full_name = 'KSE Admin';

update public.opportunities
set source_name = 'Shujog Mentor Network', updated_at = now()
where source_name = 'KSE Mentor Network';
