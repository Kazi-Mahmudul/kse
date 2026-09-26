-- Seed the Satkhira education institutions list (Satkhira district only).
-- Source: docs/List of Institutes in Satkhira.md (Wikipedia-derived, kept as
-- written in the source).
--
-- Mirrors the Khulna seed migration:
--   * type           — 'school' for primary + secondary schools,
--                      'college' for higher-secondary / degree colleges
--   * ownership_type — 'public' for "Government"/"Govt." institutions,
--                      'private' for everything else
--   * city           — always 'Satkhira' (the picker filters by this column
--                      when the student picks Satkhira as their district)
--   * area           — upazila or specific neighborhood, without a redundant
--                      "Satkhira" suffix (city already says Satkhira, so the
--                      picker renders "<area>, Satkhira")
--
-- Re-running is safe: the unique partial index
-- (lower(name), coalesce(city, ''), type) WHERE is_active = true on
-- education_institutions dedupes identical active rows.

-- ── Public Primary Schools ─────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('32 No. Uchchepara Government Primary School', 'school', 'public', 'Satkhira', 'Kaliganj'),
  ('Indira Government Primary School', 'school', 'public', 'Satkhira', 'Satkhira Sadar'),
  ('72 No. Taltala Government Primary School', 'school', 'public', 'Satkhira', 'Binerpota, Satkhira Sadar'),
  ('64 No. Puijala Government Primary School', 'school', 'public', 'Satkhira', 'Puijala, Shyamnagar'),
  ('13 No. Bara Durgapur Government Primary School', 'school', 'public', 'Satkhira', 'Assasuni'),
  ('48 No. Champakhali Government Primary School', 'school', 'public', 'Satkhira', 'Assasuni');

-- ── Public Secondary Schools ───────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Satkhira Government High School', 'school', 'public', 'Satkhira', 'Satkhira Sadar'),
  ('Satkhira Government Girls'' High School', 'school', 'public', 'Satkhira', 'Satkhira Sadar'),
  ('Kalaroa Government G.K.M.K. Pilot Secondary School', 'school', 'public', 'Satkhira', 'Kalaroa');

-- ── Private / Non-government Secondary Schools ─────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Bhomra Union Pallishree Secondary School', 'school', 'private', 'Satkhira', 'Bhomra, Shyamnagar'),
  ('Kakbasia Bangabandhu Secondary School', 'school', 'private', 'Satkhira', 'Kakbasia, Kalaroa'),
  ('Sakhipur Secondary School', 'school', 'private', 'Satkhira', 'Sakhipur, Kalaroa'),
  ('Ratanpur Tarkar Secondary High School', 'school', 'private', 'Satkhira', 'Ratanpur, Tala'),
  ('Taltala Adarsha Secondary School', 'school', 'private', 'Satkhira', 'Binerpota, Satkhira Sadar'),
  ('Sundarban Textile Mills High School', 'school', 'private', 'Satkhira', 'Kalaroa'),
  ('Puijala B.M.R.B. Secondary School', 'school', 'private', 'Satkhira', 'Puijala, Shyamnagar'),
  ('Balabaria Amzad Ali Secondary School', 'school', 'private', 'Satkhira', 'Balabaria, Shyamnagar'),
  ('Nalta Secondary School', 'school', 'private', 'Satkhira', 'Nalta, Assasuni'),
  ('Kodanda Secondary School', 'school', 'private', 'Satkhira', 'Assasuni'),
  ('Balli Adarsha Secondary Girls'' School', 'school', 'private', 'Satkhira', 'Balli, Kaliganj');

-- ── Public Colleges ─────────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Satkhira Government College', 'college', 'public', 'Satkhira', 'Satkhira Sadar'),
  ('Satkhira Government Women''s College', 'college', 'public', 'Satkhira', 'Satkhira Sadar'),
  ('Kaliganj Government College', 'college', 'public', 'Satkhira', 'Kaliganj'),
  ('Shyamnagar Government Mohsin College', 'college', 'public', 'Satkhira', 'Shyamnagar'),
  ('Assasuni Government College', 'college', 'public', 'Satkhira', 'Assasuni'),
  ('Khan Bahadur Ahsanullah Government College', 'college', 'public', 'Satkhira', 'Satkhira Sadar'),
  ('Tala Government College', 'college', 'public', 'Satkhira', 'Tala');

-- ── Private Colleges ───────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('DRA United Ideal College', 'college', 'private', 'Satkhira', 'Kaliganj'),
  ('Sheikh Amanullah Degree College', 'college', 'private', 'Satkhira', 'Satkhira Sadar'),
  ('APS Degree College', 'college', 'private', 'Satkhira', 'Satkhira Sadar'),
  ('Jatpur Technical and Business Management College', 'college', 'private', 'Satkhira', 'Jatpur, Tala'),
  ('Haji Nasir Uddin Degree College', 'college', 'private', 'Satkhira', 'Chalimpur, Kalaroa'),
  ('Nalta Ahsania Mission Residential College', 'college', 'private', 'Satkhira', 'Nalta, Assasuni');
