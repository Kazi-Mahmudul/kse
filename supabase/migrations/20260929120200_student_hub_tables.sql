-- ============================================================
-- Student Hub — tables, indexes, triggers, RLS
-- Migration: 20260929120200_student_hub_tables.sql
--
-- Tables: student_hub_categories, student_hub_listings,
--         student_hub_offers, student_hub_favorites,
--         student_book_listings, research_profiles, research_requests
--
-- Reports for hub targets reuse the central `reports` table with the
-- new report_target_type values (see 20260929120100).
--
-- Trust model (mirrors tolet):
--   - Public reads via RLS (published/active rows only)
--   - Directory listings written by staff (service role) or the
--     hub-actions Edge Function (user submissions → pending_review)
--   - Book exchange + research profiles are student-owned content with
--     owner-scoped RLS write policies (like community posts)
--   - Notification-bearing writes (research requests, book contact)
--     go through hub-actions so the service role can insert notifications
-- ============================================================

-- ── Search helpers ───────────────────────────────────────────────────────────
-- Wrapping to_tsvector in IMMUTABLE functions (public.tsvector_simple
-- pattern) lets them back stored generated columns.

create or replace function public.hub_listing_search_vector(
  name text, area text, city text, services text[], summary text, description text
)
returns tsvector
language sql
immutable
as $$
  select setweight(to_tsvector('simple'::regconfig, coalesce(name, '')), 'A')
      || setweight(to_tsvector('simple'::regconfig, coalesce(area, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(city, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(services, ' '), '')), 'C')
      || setweight(to_tsvector('simple'::regconfig, coalesce(summary, '')), 'C')
      || setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'D');
$$;

create or replace function public.book_listing_search_vector(
  title text, author text, subject text, description text
)
returns tsvector
language sql
immutable
as $$
  select setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A')
      || setweight(to_tsvector('simple'::regconfig, coalesce(author, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(subject, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C');
$$;

create or replace function public.research_profile_search_vector(
  interest text, discipline text, topic text, skills text[], institution text, bio text
)
returns tsvector
language sql
immutable
as $$
  select setweight(to_tsvector('simple'::regconfig, coalesce(interest, '')), 'A')
      || setweight(to_tsvector('simple'::regconfig, coalesce(discipline, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(topic, '')), 'B')
      || setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(skills, ' '), '')), 'C')
      || setweight(to_tsvector('simple'::regconfig, coalesce(institution, '')), 'C')
      || setweight(to_tsvector('simple'::regconfig, coalesce(bio, '')), 'D');
$$;

-- ── Categories ───────────────────────────────────────────────────────────────

create table public.student_hub_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  -- Ionicons glyph name rendered by the mobile app (falls back to a grid
  -- icon client-side when unknown). Admin-managed, never hardcoded in app code.
  icon text not null default 'grid-outline',
  -- Optional entry points the category screen links to (subset of
  -- 'book_exchange' | 'research_partners').
  features text[] not null default '{}' check (
    features <@ array['book_exchange', 'research_partners']::text[]
  ),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_hub_categories_active_idx
  on public.student_hub_categories (is_active, sort_order);

create trigger set_updated_at before update on public.student_hub_categories
  for each row execute function public.set_updated_at();

alter table public.student_hub_categories enable row level security;

create policy student_hub_categories_select_public on public.student_hub_categories
  for select to anon, authenticated
  using (is_active or public.is_staff());
-- Writes: staff only, via service-role client (admin actions).

-- ── Listings ─────────────────────────────────────────────────────────────────

create table public.student_hub_listings (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.student_hub_categories(id)
    on delete restrict,
  name text not null,
  service_type public.hub_service_type not null default 'other',
  summary text,
  description text,
  status public.hub_listing_status not null default 'draft',
  -- Verification (spec student-hub §21) — staff-controlled only.
  verified boolean not null default false,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  last_verified_at timestamptz,
  -- Location (text-based like the rest of KSE; lat/lng optional for maps).
  address text,
  area text,
  city text not null default 'Khulna',
  district text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  -- Contact (all optional — the app only shows actions for present data).
  phone text,
  whatsapp text,
  email text,
  -- Hours: free-text for display + optional structured pair that powers
  -- the honest "Open now" filter (rows without structured hours never
  -- claim to be open or closed).
  opening_hours text,
  opens_at time,
  closes_at time,
  -- Pricing (descriptive text, never fabricated into a fixed price).
  price_note text,
  price_type public.hub_price_type,
  services text[] not null default '{}',
  image_url text,
  image_urls text[] not null default '{}',
  -- Denormalized "has at least one active offer" flag (spec §15 filter).
  has_student_discount boolean not null default false,
  -- Provenance + workflow.
  source text not null default 'admin' check (source in ('admin', 'user_submission')),
  submitted_by uuid references auth.users(id) on delete set null,
  review_note text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    public.hub_listing_search_vector(
      name, area, city, services, summary, description
    )
  ) stored
);

create index student_hub_listings_browse_idx on public.student_hub_listings
  (category_id, status, updated_at desc);
create index student_hub_listings_published_idx on public.student_hub_listings
  (updated_at desc) where status = 'published';
create index student_hub_listings_service_idx on public.student_hub_listings
  (service_type) where status = 'published';
create index student_hub_listings_area_idx on public.student_hub_listings
  (city, area) where status = 'published';
create index student_hub_listings_discount_idx on public.student_hub_listings
  (has_student_discount) where status = 'published';
create index student_hub_listings_search_idx on public.student_hub_listings
  using gin (search_vector);
create index student_hub_listings_submitter_idx on public.student_hub_listings
  (submitted_by);
-- Keeping has_student_discount truthful: it flips automatically when the
-- listing's active offers appear or disappear.
create or replace function public.sync_listing_discount_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing uuid := coalesce(new.listing_id, old.listing_id);
  v_has boolean;
begin
  select exists (
    select 1 from public.student_hub_offers o
    where o.listing_id = v_listing
      and o.is_active
      and (o.valid_from is null or o.valid_from <= current_date)
      and (o.valid_until is null or o.valid_until >= current_date)
  ) into v_has;

  update public.student_hub_listings
  set has_student_discount = v_has
  where id = v_listing and has_student_discount is distinct from v_has;

  return coalesce(new, old);
end;
$$;

create trigger set_updated_at before update on public.student_hub_listings
  for each row execute function public.set_updated_at();

alter table public.student_hub_listings enable row level security;

create policy student_hub_listings_select_public on public.student_hub_listings
  for select to anon, authenticated
  using (
    (status = 'published' and (published_at is null or published_at <= now()))
    or public.is_staff()
    or (submitted_by = auth.uid())
  );
-- Writes: service role only (admin actions + hub-actions Edge Function).

-- ── Offers (student deals) ───────────────────────────────────────────────────

create table public.student_hub_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.student_hub_listings(id)
    on delete cascade,
  title text not null,
  discount_kind public.hub_offer_kind not null default 'percent',
  -- percent: 1–100 · amount: integer paisa (BDT × 100) · other: null
  discount_value int,
  applies_to text,
  student_id_required boolean not null default true,
  valid_from date,
  valid_until date,
  terms text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_hub_offers_percent_range check (
    discount_kind <> 'percent' or (discount_value between 1 and 100)
  ),
  constraint student_hub_offers_amount_pair check (
    discount_kind <> 'amount' or discount_value is not null
  ),
  constraint student_hub_offers_dates check (
    valid_from is null or valid_until is null or valid_from <= valid_until
  )
);

create index student_hub_offers_listing_idx on public.student_hub_offers
  (listing_id, is_active);
create index student_hub_offers_active_idx on public.student_hub_offers
  (valid_until) where is_active;

create trigger set_updated_at before update on public.student_hub_offers
  for each row execute function public.set_updated_at();

create trigger student_hub_offers_sync_discount
  after insert or update or delete on public.student_hub_offers
  for each row execute function public.sync_listing_discount_flag();

alter table public.student_hub_offers enable row level security;

-- Expired/inactive offers are hidden from the public automatically.
create policy student_hub_offers_select_public on public.student_hub_offers
  for select to anon, authenticated
  using (
    public.is_staff()
    or (
      is_active
      and (valid_from is null or valid_from <= current_date)
      and (valid_until is null or valid_until >= current_date)
    )
  );

-- ── Favorites ────────────────────────────────────────────────────────────────

create table public.student_hub_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.student_hub_listings(id)
    on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.student_hub_favorites enable row level security;

create policy student_hub_favorites_select_own on public.student_hub_favorites
  for select to authenticated using (user_id = auth.uid());
create policy student_hub_favorites_insert_own on public.student_hub_favorites
  for insert to authenticated with check (user_id = auth.uid());
create policy student_hub_favorites_delete_own on public.student_hub_favorites
  for delete to authenticated using (user_id = auth.uid());

-- ── Book Exchange Corner ─────────────────────────────────────────────────────

create table public.student_book_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  subject text,
  edition text,
  condition public.book_condition not null default 'good',
  intent public.book_intent not null default 'exchange',
  -- Asking price in paisa (BDT × 100) — only meaningful when selling.
  price int check (price is null or price >= 0),
  expected_exchange text,
  description text,
  image_urls text[] not null default '{}',
  contact_preference text not null default 'in_app'
    check (contact_preference in ('in_app', 'phone')),
  -- Phone is only exposed publicly when the owner opts in via
  -- contact_preference = 'phone' (spec student-hub §28).
  phone text,
  status public.book_listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    public.book_listing_search_vector(title, author, subject, description)
  ) stored
);

create index student_book_listings_browse_idx on public.student_book_listings
  (status, updated_at desc);
create index student_book_listings_owner_idx on public.student_book_listings
  (owner_id, updated_at desc);
create index student_book_listings_search_idx on public.student_book_listings
  using gin (search_vector);

create trigger set_updated_at before update on public.student_book_listings
  for each row execute function public.set_updated_at();

alter table public.student_book_listings enable row level security;

create policy student_book_listings_select_public on public.student_book_listings
  for select to anon, authenticated
  using (status <> 'removed' or owner_id = auth.uid() or public.is_staff());

create policy student_book_listings_insert_own on public.student_book_listings
  for insert to authenticated
  with check (owner_id = auth.uid() and status = 'active');

-- Owners manage their own listings; owner_id and created_at are immutable
-- (enforced by the matching WITH CHECK).
create policy student_book_listings_update_own on public.student_book_listings
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── Research Partner Matching ────────────────────────────────────────────────

create table public.research_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  research_interest text not null,
  discipline text,
  topic text,
  skills text[] not null default '{}',
  collaboration_type public.research_collaboration_type not null default 'any',
  institution text,
  district text,
  availability text,
  bio text,
  status public.research_profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    public.research_profile_search_vector(
      research_interest, discipline, topic, skills, institution, bio
    )
  ) stored
);

create index research_profiles_browse_idx on public.research_profiles
  (status, updated_at desc);
create index research_profiles_district_idx on public.research_profiles
  (district) where status = 'active';
create index research_profiles_search_idx on public.research_profiles
  using gin (search_vector);

create trigger set_updated_at before update on public.research_profiles
  for each row execute function public.set_updated_at();

alter table public.research_profiles enable row level security;

create policy research_profiles_select_public on public.research_profiles
  for select to anon, authenticated
  using (status = 'active' or user_id = auth.uid() or public.is_staff());

create policy research_profiles_insert_own on public.research_profiles
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'active');

create policy research_profiles_update_own on public.research_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.research_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_profile_id uuid not null references public.research_profiles(id)
    on delete cascade,
  message text not null,
  status public.research_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- One pending request per sender/profile pair (re-requesting after a
-- decline is allowed).
create unique index research_requests_one_pending_idx
  on public.research_requests (from_user_id, to_profile_id)
  where status = 'pending';

create index research_requests_inbox_idx on public.research_requests
  (to_profile_id, status, created_at desc);
create index research_requests_sent_idx on public.research_requests
  (from_user_id, created_at desc);

alter table public.research_requests enable row level security;

create policy research_requests_select_parties on public.research_requests
  for select to authenticated
  using (
    from_user_id = auth.uid()
    or exists (
      select 1 from public.research_profiles p
      where p.id = to_profile_id and p.user_id = auth.uid()
    )
    or public.is_staff()
  );

-- Inserts happen through the hub-actions Edge Function (which also notifies
-- the recipient); RLS still blocks direct self-requests as defence in depth.
create policy research_requests_insert_own on public.research_requests
  for insert to authenticated
  with check (
    from_user_id = auth.uid()
    and not exists (
      select 1 from public.research_profiles p
      where p.id = to_profile_id and p.user_id = auth.uid()
    )
  );

-- Only the recipient updates the status (accept/decline) — via hub-actions.
create policy research_requests_update_recipient on public.research_requests
  for update to authenticated
  using (
    exists (
      select 1 from public.research_profiles p
      where p.id = to_profile_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.research_profiles p
      where p.id = to_profile_id and p.user_id = auth.uid()
    )
  );

-- ── Report de-duplication for hub targets ────────────────────────────────────
-- One open report per reporter+target across the Student Hub targets; the
-- central reports table (20260906120010) keeps its insert-own RLS policy.

create unique index reports_hub_one_open_idx on public.reports
  (reporter_id, target_type, target_id)
  where status = 'open'
    and target_type in ('student_hub_listing', 'book_listing', 'research_profile');
