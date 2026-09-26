-- Bachelor To-Let — domain enums.
--
-- Three enums to support the housing-listing discriminator fields on the
-- shared `opportunities` table. They live as nullable columns for non-tolet
-- rows (set during type-specific inserts), so we never pollute the existing
-- types module.
--
-- Idempotent guards (do $do$ ... select 1 from pg_type ...) keep the file
-- safe to re-run after partial failures. Mirrors the pattern in
-- 20260907170000_internship_hub_fields.sql.

do $do$ begin
  if not exists (select 1 from pg_type where typname = 'tolet_room_type') then
    create type public.tolet_room_type as enum (
      'single',           -- one bed, private room
      'shared',           -- bed in a shared room with other tenants
      'sublet',           -- renting a bed in someone else's existing lease
      'mess_sublet',      -- subletting a bed inside an established bachelor mess
      'studio',           -- self-contained unit (kitchen + bath)
      'family'            -- a room inside a host family
    );
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_type where typname = 'tolet_gender_preference') then
    create type public.tolet_gender_preference as enum (
      'any',
      'male_only',
      'female_only'
    );
  end if;
end $do$;

-- Operational status separate from `opportunity_status` (which is the moderation
-- gate: draft / pending_review / published / etc.). Once a listing is published,
-- the landlord updates `listing_status` to reflect actual availability.
do $do$ begin
  if not exists (select 1 from pg_type where typname = 'tolet_listing_status') then
    create type public.tolet_listing_status as enum (
      'available',
      'almost_full',
      'full',
      'unavailable'
    );
  end if;
end $do$;

comment on type public.tolet_room_type is
  'To-Let room sub-types (single/shared/sublet/mess_sublet/studio/family)';
comment on type public.tolet_gender_preference is
  'To-Let gender preference for tenants (any/male_only/female_only)';
comment on type public.tolet_listing_status is
  'Operational status of a published listing — distinct from opportunity_status, which is the moderation workflow';
