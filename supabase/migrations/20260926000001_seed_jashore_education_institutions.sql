-- Seed the Jashore education institutions list (Jashore district only).
-- Source: docs/List of Institutes in Jashore.md (Wikipedia-derived, kept as
-- written in the source).
--
-- Mirrors the Khulna / Satkhira seed migrations:
--   * type           — 'university' for universities, 'medical_college' for
--                      medical colleges, 'college' for degree / higher-
--                      secondary colleges, 'polytechnic' for polytechnics,
--                      'arts_college' for fine-arts colleges, 'school' only
--                      when the source names the institution as a school.
--   * ownership_type — 'public' for "Government"/"Govt." institutions
--                      (incl. Cantonment, BAF Shaheen, Shiksha Board),
--                      'private' otherwise.
--   * city           — always 'Jashore' (the picker filters by this column
--                      when the student picks Jashore as their district)
--   * area           — upazila name, without a redundant "Jashore" suffix
--                      (city already says Jashore, so the picker renders
--                      "<area>, Jashore").
--
-- The source file lists three institutions twice (in the top "University and
-- Medical College" summary AND in the Jashore Sadar upazila block). The
-- unique partial index
--   (lower(name), coalesce(city, ''), type) WHERE is_active = true
-- would reject the second insert — so this migration only inserts each row
-- once, under its canonical upazila.
--
-- Re-running is safe: the same partial unique index dedupes identical
-- active rows.
--
-- Header "### District Level — 36" in the source actually lists 35; we
-- keep the source as-written, so the count here is 35 (per the source).

-- ── Abhaynagar Upazila (15) ─────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Akij Ideal School and College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Uttar Abhaynagar Technical School and College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Gabkhali Magura United College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Dhopadi S.S. College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Noapara Model College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Noapara College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Noapara Women''s College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Pairahat United College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Pallimangal Adarsha College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Bhavadaha Mahavidyalaya', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Bhoyrab Adarsha Mahavidyalaya', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Mahakal Pilot School and College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Sheikh Abdul Wahab Model College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Sreedharpur Union College', 'college', 'private', 'Jashore', 'Abhaynagar'),
  ('Sundali S.T. School and College', 'college', 'private', 'Jashore', 'Abhaynagar');

-- ── Keshabpur Upazila (14) ──────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Ideal College', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Abu Sharaf Sadek Technical and Commerce College', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Abu Sharaf Sadek Government Technical School and College', 'college', 'public', 'Jashore', 'Keshabpur'),
  ('Kapotaksha Sammilani Degree College', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Keshabpur Government Degree College', 'college', 'public', 'Jashore', 'Keshabpur'),
  ('Keshabpur Government Pilot Higher Secondary School', 'school', 'public', 'Jashore', 'Keshabpur'),
  ('Keshabpur Poura Technical and Commerce College', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Tita Bajitpur M.K.B. Women''s College', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Dakshin Bengal College', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Pajia Mahavidyalaya', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Baliadanga Sarbojanin Debalaya Technical and Business Management College', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Muktijoddha Mahavidyalaya', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Haji Abdul Motaleb Women''s College', 'college', 'private', 'Jashore', 'Keshabpur'),
  ('Hijaldanga Shaheed Foli Ghat Lat Masud Memorial College', 'college', 'private', 'Jashore', 'Keshabpur');

-- ── Chaugachha Upazila (11) ─────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Arazi Sultanpur Bakshipur Chakla Debipur A.K.D. College', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('S.M. Habibur Rahman Poura College, Chaugachha', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('Guatoli Chandpara Borokhanpur Badekhanpur Bundolitola Adarsha College', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('Chaugachha Degree College', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('Chaugachha Moridhapara Women''s College', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('J.M.S.K. College', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('Tarikul Islam Poura College', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('Pashapol Amjam Tala Model College', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('Marua Oklahoma Yousuf Ali Khan Secondary School and College', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('Solua Adarsha Degree College', 'college', 'private', 'Jashore', 'Chaugachha'),
  ('Hakimpur Women''s College', 'college', 'private', 'Jashore', 'Chaugachha');

-- ── Jhikargachha Upazila (13) ───────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Akij Collegiate School', 'school', 'private', 'Jashore', 'Jhikargachha'),
  ('Kayemkola College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('K.M.I.S. Model College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Khoshal Nagar Technical and B.M. College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Gangnanandapur Degree College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Jhikargachha Women''s Degree College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Nirbashkhola School and College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Bankra Degree College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Bankra Hajirbag Ideal Girls'' School and College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Raghunath Nagar College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Shaheed Mashiur Rahman Degree College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Shammalini Girls'' Degree College', 'college', 'private', 'Jashore', 'Jhikargachha'),
  ('Shimulia College', 'college', 'private', 'Jashore', 'Jhikargachha');

-- ── Bagherpara Upazila (13) ─────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Khabir Ur Rahman College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Chitra Model College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Chatiantala Girls'' School and United College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Japan Bangladesh Friendship Agriculture and Technical College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Narikel Baria College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Bagherpara Degree College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Bagherpara Women''s College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Bir Protik Ishakue Degree College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Bhangura Adarsha Degree College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Mirzapur Adarsha Women''s Degree College, Khajura', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Jadavpur Technical School and Business Management College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Raipur School and College', 'college', 'private', 'Jashore', 'Bagherpara'),
  ('Shaheed Sirajuddin Hossain Government College', 'college', 'public', 'Jashore', 'Bagherpara');

-- ── Monirampur Upazila (21) ─────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Kuadha Higher Secondary School and College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Gopalpur M.L. High School and College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Chinatola College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Dhakuria College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Nengura Secondary School and College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Nehalpur School and College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Palashi Adarsha College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Baliadanga Khanpur College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Monirampur Technical School and College, Jashore', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Monirampur Government Degree College', 'college', 'public', 'Jashore', 'Monirampur'),
  ('Manoharpur Technical and Science College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Matribhasha Mahavidyalaya', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Mashiahati Degree College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Mashwimnagar High School and College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Mukteshwari Degree College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Monirampur Women''s Degree College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Mosiahati Akhaya Girls'' Technical School and College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Rajganj Mahavidyalaya', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Shaheed Muktijoddha A.R. Women''s College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Sabuj Palli College', 'college', 'private', 'Jashore', 'Monirampur'),
  ('Sammilani Degree College', 'college', 'private', 'Jashore', 'Monirampur');

-- ── Sharsha Upazila (12) ────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('United Adarsha College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Dr. Afil Uddin College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Dr. Mashiur Rahman Women''s College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Navaron College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Pakshia Ideal College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Fazila Tunnesa Women''s Degree College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Bagachra Sammilita Girls'' School and College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Benapole Degree College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Lakshmanpur School and College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Sharsha Technical School and College', 'college', 'private', 'Jashore', 'Sharsha'),
  ('Government Bir Shrestha Noor Mohammad College', 'college', 'public', 'Jashore', 'Sharsha'),
  ('Sharsha Upazila College', 'college', 'private', 'Jashore', 'Sharsha');

-- ── Jashore Sadar Upazila (3 medical colleges) ──────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Ad-Din Sakina Medical College', 'medical_college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Armed Forces Medical College', 'medical_college', 'public', 'Jashore', 'Jashore Sadar'),
  ('Jashore Medical College', 'medical_college', 'public', 'Jashore', 'Jashore Sadar');

-- ── Jashore Sadar — District Level (35) ─────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Jashore University of Science and Technology', 'university', 'public', 'Jashore', 'Chanchra, Jashore Sadar'),
  ('Amdabad College, Jashore', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Ichhali Model College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Upashahar Degree College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Upashahar Women''s Degree College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('S.M. Sultan Fine Arts College, Jashore', 'arts_college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Kazi Nazrul Islam Degree College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Kapotaksha Polytechnic College', 'polytechnic', 'private', 'Jashore', 'Jashore Sadar'),
  ('Cantonment College, Jashore', 'college', 'public', 'Jashore', 'Jashore Sadar'),
  ('Dr. Abdur Razzak Poura College, Jashore', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Dr. Raushan Ali College of Science, Technology and B.M., Majdia', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Talbaria Degree College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Dawood Public School and College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Natun Hat Public College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Nursing and Midwifery College, Jashore', 'college', 'public', 'Jashore', 'Jashore Sadar'),
  ('New Model College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('B.K.M. College of Engineering and Technology', 'polytechnic', 'private', 'Jashore', 'Jashore Sadar'),
  ('Basundia Secondary School and College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Bangladesh Technical College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('BAF Shaheen College, Jashore', 'college', 'public', 'Jashore', 'Jashore Sadar'),
  ('Bhaturia High School and College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Madhusudan Taraprasanna Girls'' Secondary School and College, Jashore', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Muktijoddha College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Jashore English School and College (JESC)', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Jashore College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Jashore Technical School and College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Jashore Technical and Management College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Jashore Shiksha Board Model School and College', 'college', 'public', 'Jashore', 'Jashore Sadar'),
  ('Jashore Government Women''s College', 'college', 'public', 'Jashore', 'Jashore Sadar'),
  ('Jashore Government City College', 'college', 'public', 'Jashore', 'Jashore Sadar'),
  ('Jashore Home Economics College', 'college', 'public', 'Jashore', 'Jashore Sadar'),
  ('Rupdia Shaheed Smriti College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Shaheed Mashiur Rahman Law College, Jashore', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Government Michael Madhusudan College, Jashore', 'college', 'public', 'Jashore', 'Jashore Sadar'),
  ('Singia Adarsha Degree College', 'college', 'private', 'Jashore', 'Jashore Sadar'),
  ('Hamidpur Al-Hera College', 'college', 'private', 'Jashore', 'Jashore Sadar');
