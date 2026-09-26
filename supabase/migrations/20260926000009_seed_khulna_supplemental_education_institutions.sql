-- Supplemental seed: education institutions that are present in the
-- older Khulna list (docs/List of institutes in Khulna.md) but absent
-- from the new authoritative list (docs/List of institutes in Khulna 2.md,
-- which is the basis for the primary Khulna seed).
--
-- Purpose: when the new (Khulna 2.md) seed migrates in, these institutions
-- would be lost — the old Wikipedia-style list had several categories
-- (English-medium schools, IGV/UCEP programs, art college, polytechnic,
-- medical colleges, nursing colleges) that the new EiIN-style table does
-- not enumerate. This migration adds back the missing entries, so that
-- the prior 20260924153600 Khulna seed stays complete.
--
-- Mirrors the Khulna Division seeds:
--   * type           — direct mapping from the old doc's category
--                      (University → 'university'; Medical College →
--                      'medical_college' (incl. Nursing Colleges that
--                      grant BNursing); College → 'college'; School →
--                      'school'; Madrasah → 'madrasa'; IGV/UCEP →
--                      'school'; Technical School → 'technical_school';
--                      English Medium → 'english_medium'; Art College →
--                      'arts_college'; Polytechnic → 'polytechnic';
--                      Military School → 'school' or 'military_school').
--                      "Sunflower Tutorial" is grouped under English medium
--                      in the old doc and tagged accordingly.
--   * ownership_type — 'public' for "Govt." / "Government" rows AND for
--                      institutional entities run by the state (Khulna
--                      Power Station High School = BPDB institutional;
--                      Khulna Shipyard Technical Training Center = state
--                      enterprise). 'private' otherwise.
--   * city           — 'Khulna' (the picker filters by this column when
--                      the student picks Khulna as their district).
--   * area           — upazila inferred from the location mention in the
--                      old doc; Choto Boyra → Sonadanga, Fulbari Gate →
--                      Daulatpur, Khalispur → Khalishpur, Sonadanga →
--                      Sonadanga, Senhati → Dighalia, Shipyard / Rupsha →
--                      Rupsha, Boikali → Sonadanga, Moylapota → Khulna
--                      Sadar. For entries without a clear location, the
--                      default is Khulna Sadar (the central upazila).
--
-- Source-quality notes (kept as-written for traceability):
--   * Typographic typos preserved (e.g. "Squire" — possibly a transliteration
--     of "Square"; "S S R"; "SCOOL"; "HERMAN MINER"/"HERMANN GMEINER").
--   * Apostrophes inside names are doubled for SQL where applicable.
--
-- Re-running is safe: the partial unique index
--   (lower(name), coalesce(city, ''), type) WHERE is_active = true
-- dedupes identical active rows. Institutions already in the DB from the
-- earlier 20260924153600 seed will be silently skipped.
--
-- Total rows in this supplement: 25.

insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Khulna Medical College', 'medical_college', 'public', 'Khulna', 'Khulna Sadar'),
  ('Khulna Nursing College', 'medical_college', 'public', 'Khulna', 'Sonadanga'),
  ('Ad-Din Akij Medical College', 'medical_college', 'private', 'Khulna', 'Sonadanga'),
  ('Khulna City Medical College', 'medical_college', 'private', 'Khulna', 'Khulna Sadar'),
  ('Khulna Mamota Nursing College', 'medical_college', 'private', 'Khulna', 'Daulatpur'),
  ('Gazi Medical College', 'medical_college', 'private', 'Khulna', 'Sonadanga'),
  ('Sarowar Khan Degree College', 'college', 'private', 'Khulna', 'Dighalia'),
  ('Khulna Power Station High School', 'school', 'public', 'Khulna', 'Khalishpur'),
  ('PMG High School', 'school', 'private', 'Khulna', 'Sonadanga'),
  ('Need School', 'school', 'private', 'Khulna', 'Sonadanga'),
  ('S S R School', 'school', 'private', 'Khulna', 'Khulna Sadar'),
  ('Shahid Sheikh Abu Naser Dakhil Madrasah', 'madrasa', 'private', 'Khulna', 'Khulna Sadar'),
  ('Darul Ulum Mosque and Madrasa', 'madrasa', 'private', 'Khulna', 'Khulna Sadar'),
  ('UCEP-K C C School, Rupsha', 'school', 'private', 'Khulna', 'Rupsha'),
  ('Technical Training Center Khulna', 'technical_school', 'private', 'Khulna', 'Daulatpur'),
  ('Khulna Shipyard Technical Training Center', 'technical_school', 'public', 'Khulna', 'Rupsha'),
  ('Morning Bell English Medium School', 'english_medium', 'private', 'Khulna', 'Khulna Sadar'),
  ('Tulip English School', 'english_medium', 'private', 'Khulna', 'Khulna Sadar'),
  ('Sunflower Tutorial', 'english_medium', 'private', 'Khulna', 'Khulna Sadar'),
  ('Elizabeth Primary School', 'school', 'private', 'Khulna', 'Khulna Sadar'),
  ('Jahan International School', 'english_medium', 'private', 'Khulna', 'Khulna Sadar'),
  ('Khulna Art College', 'arts_college', 'private', 'Khulna', 'Sonadanga'),
  ('Squire Polytechnic Institute', 'polytechnic', 'private', 'Khulna', 'Khulna Sadar'),
  ('Squire Medical Institute', 'technical_school', 'private', 'Khulna', 'Khulna Sadar'),
  ('PSTI (Public Science and Technology Institute) Polytechnic Institute', 'polytechnic', 'private', 'Khulna', 'Khulna Sadar');
