-- ── Profile location (country / division / district) ────────────────────────
-- Roadmap step 18: students living away from university need a stable place
-- for country / division / district. Country and division are seeded with
-- Bangladesh / Khulna because that's where the app currently operates, but
-- the columns themselves are plain text so we can swap them later (e.g. add
-- a `country` picker or seed Dhaka once multi-division support ships).
--
-- District is intentionally nullable — students register with limited info
-- and update it later once they settle into their city. The mobile form
-- (apps/mobile/src/app/(tabs)/profile/edit.tsx) restricts the picker to the
-- ten districts of Khulna Division for now; the DB stays open so the day we
-- expand divisions, we don't need a schema change.

alter table public.profiles
  add column if not exists country   text not null default 'Bangladesh',
  add column if not exists division  text not null default 'Khulna',
  add column if not exists district  text;

-- Length caps that mirror the validation package (district name max 80).
alter table public.profiles
  drop constraint if exists profiles_country_length;
alter table public.profiles
  add constraint profiles_country_length check (char_length(country) <= 80);
alter table public.profiles
  drop constraint if exists profiles_division_length;
alter table public.profiles
  add constraint profiles_division_length check (char_length(division) <= 80);
alter table public.profiles
  drop constraint if exists profiles_district_length;
alter table public.profiles
  add constraint profiles_district_length check (district is null or char_length(district) <= 80);

-- Backfill: every existing row gets the defaults above via the column DEFAULT.
-- Idempotent: subsequent runs on already-populated rows are no-ops.
update public.profiles
   set country  = 'Bangladesh',
       division = 'Khulna'
 where country is null or division is null;

-- Defensive: re-grant SELECT to the api roles so the new columns are
-- visible to the authenticated client. Supabase normally handles this
-- automatically when columns are added via the dashboard, but raw SQL
-- additions can miss the GRANT sync — and a missing GRANT surfaces as
-- 403 from PostgREST even though RLS says "allow".
grant select (country, division, district) on public.profiles to anon;
grant select (country, division, district) on public.profiles to authenticated;

-- PostgREST caches the schema; the new columns won't show up in
-- `?select=country,division,district` until it reloads. Supabase's
-- auto-reloader usually picks this up within a few seconds, but
-- explicit reload makes the change immediate so we don't ship a
-- half-applied state to the mobile app. Two NOTIFYs with a brief
-- pause is the standard cloud workaround — single NOTIFY sometimes
-- races the watcher and is silently dropped.
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
  perform pg_sleep(0.5);
  perform pg_notify('pgrst', 'reload schema');
end $$;
