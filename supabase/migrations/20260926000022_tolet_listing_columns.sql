-- Bachelor To-Let — add listing-specific columns to the shared `opportunities`
-- table. All nullable so non-tolet rows stay untouched.
--
-- Columns (with their purpose):
--   rent_amount / rent_currency — paired monthly rent (numeric 10,2 + 3-letter
--                                 ISO code). CHECK constraint enforces both-NULL
--                                 or both-set, mirroring the internship stipend
--                                 pair-check in 20260907170000_internship_hub_fields.sql.
--   room_type / gender_preference / available_from / bachelor_friendly —
--                                 structured filter chips on the mobile hub.
--   landlord_phone / whatsapp / contact_email — exposed on the detail page so
--                                 students can call / message / email directly.
--                                 Phone is required at insert time (validated
--                                 in the Edge Function, not the column).
--   listing_status — separate from opportunity_status; updated by the landlord
--                                 after publication to reflect actual availability.
--   image_urls — public text[] of storage URLs; max 8 enforced in the Edge
--                 Function (not the column) to keep storage bucket policies
--                 in one place.
--   city / area — denormalised for the city/area filter index. `location` is
--                 a free-form string for the card subtitle.
--   floor / total_rooms / available_rooms / utilities_included — room facts
--                                 surfaced on the detail page.
--
-- Indexes (partial — only tolet rows use these columns):
--   (type, listing_status, city) — primary browse index
--   (type, room_type)
--   (type, city, area)
--   (type, rent_amount) for cheap sort-by-rent

begin;

alter table public.opportunities
  add column if not exists rent_amount          numeric(10,2),
  add column if not exists rent_currency        text,
  add column if not exists room_type            public.tolet_room_type,
  add column if not exists gender_preference    public.tolet_gender_preference,
  add column if not exists available_from       date,
  add column if not exists bachelor_friendly    boolean not null default true,
  add column if not exists landlord_phone       text,
  add column if not exists whatsapp             text,
  add column if not exists contact_email        text,
  add column if not exists listing_status       public.tolet_listing_status not null default 'available',
  add column if not exists image_urls           text[] not null default '{}',
  add column if not exists city                 text,
  add column if not exists area                 text,
  add column if not exists floor                smallint,
  add column if not exists total_rooms          smallint,
  add column if not exists available_rooms      smallint,
  add column if not exists utilities_included   boolean not null default false;

-- ISO-4217-style currency code when present.
do $do$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_rent_currency_chk'
  ) then
    alter table public.opportunities
      add constraint opportunities_rent_currency_chk
      check (rent_currency is null or rent_currency ~ '^[A-Z]{3}$');
  end if;
end $do$;

-- Rent amount/currency pair.
do $do$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_rent_pair_chk'
  ) then
    alter table public.opportunities
      add constraint opportunities_rent_pair_chk
      check (
        (rent_amount is null and rent_currency is null) or
        (rent_amount is not null and rent_currency is not null)
      );
  end if;
end $do$;

-- available_rooms ≤ total_rooms when both present.
do $do$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_available_rooms_chk'
  ) then
    alter table public.opportunities
      add constraint opportunities_available_rooms_chk
      check (
        total_rooms is null
        or available_rooms is null
        or available_rooms <= total_rooms
      );
  end if;
end $do$;

-- At least one contact channel required for tolet listings.
-- We can't reference `type` from a CHECK constraint without making the column
-- NOT NULL on tolet, so the Edge Function enforces this at write time.
-- (Documented in the function code.)

-- ── Indexes (partial on type='tolet' for plan-size and write cost) ──────────
create index if not exists opportunities_tolet_browse_idx
  on public.opportunities (listing_status, city, updated_at desc)
  where type = 'tolet' and status = 'published';

create index if not exists opportunities_tolet_room_type_idx
  on public.opportunities (room_type)
  where type = 'tolet' and room_type is not null;

create index if not exists opportunities_tolet_city_area_idx
  on public.opportunities (city, area)
  where type = 'tolet' and city is not null;

create index if not exists opportunities_tolet_rent_idx
  on public.opportunities (rent_amount)
  where type = 'tolet' and rent_amount is not null;

-- For owner-dashboard queries (my listings).
create index if not exists opportunities_tolet_owner_idx
  on public.opportunities (created_by, updated_at desc)
  where type = 'tolet' and created_by is not null;

-- ── Comments ────────────────────────────────────────────────────────────────
comment on column public.opportunities.rent_amount is
  'Bachelor To-Let: monthly rent amount. Pair with rent_currency.';
comment on column public.opportunities.rent_currency is
  'Bachelor To-Let: 3-letter ISO-4217 currency code (BDT, USD, …). NULL unless rent_amount set.';
comment on column public.opportunities.room_type is
  'Bachelor To-Let: single / shared / sublet / mess_sublet / studio / family';
comment on column public.opportunities.gender_preference is
  'Bachelor To-Let: any / male_only / female_only';
comment on column public.opportunities.available_from is
  'Bachelor To-Let: date the room is available from';
comment on column public.opportunities.bachelor_friendly is
  'Bachelor To-Let: true when the landlord welcomes students';
comment on column public.opportunities.landlord_phone is
  'Bachelor To-Let: phone for `tel:` contact (E.164 or local format)';
comment on column public.opportunities.whatsapp is
  'Bachelor To-Let: WhatsApp number (digits only, used in wa.me deep link)';
comment on column public.opportunities.contact_email is
  'Bachelor To-Let: optional email for email-contact';
comment on column public.opportunities.listing_status is
  'Bachelor To-Let: operational availability (available / almost_full / full / unavailable). Distinct from `status` which is the moderation gate.';
comment on column public.opportunities.image_urls is
  'Bachelor To-Let: ordered list of public image URLs (max 8 enforced in the Edge Function)';
comment on column public.opportunities.city is
  'Bachelor To-Let: denormalised city for filter chip + index';
comment on column public.opportunities.area is
  'Bachelor To-Let: denormalised neighbourhood for filter chip';
comment on column public.opportunities.floor is
  'Bachelor To-Let: floor number (NULL = unknown)';
comment on column public.opportunities.total_rooms is
  'Bachelor To-Let: total bed/room count in the unit';
comment on column public.opportunities.available_rooms is
  'Bachelor To-Let: currently vacant bed/room count';
comment on column public.opportunities.utilities_included is
  'Bachelor To-Let: true when electricity/water/gas/internet are included in the rent';

commit;
