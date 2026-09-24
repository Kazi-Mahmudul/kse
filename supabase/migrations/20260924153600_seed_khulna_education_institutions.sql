-- Seed the Khulna education institutions list (Khulna district only for now;
-- the schema is district-agnostic, so other districts can be added in the
-- same shape when their lists arrive). Source: docs/List of institutes in
-- Khulna.md (Wikipedia-derived).
--
-- This migration only touches Khulna; do not invent institutions that are
-- not in the source. Names are preserved as written.
--
-- Re-running is safe: the unique partial index
-- (lower(name), coalesce(city, ''), type) WHERE is_active = true on
-- education_institutions dedupes identical active rows.

-- ── Public Universities ─────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Khulna University', 'university', 'public', 'Khulna', 'Gollamari, Khulna'),
  ('Khulna University of Engineering and Technology', 'university', 'public', 'Khulna', 'Fulbari Gate, Khulna'),
  ('Khulna Agricultural University', 'university', 'public', 'Khulna', 'Daulatpur, Khulna'),
  ('Khulna Medical University', 'university', 'public', 'Khulna', 'Nirala, Khulna');

-- ── Private Universities ────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Bangladesh Army University of Science and Technology Khulna', 'university', 'private', 'Khulna', 'Shiromoni, Khulna'),
  ('North Western University', 'university', 'private', 'Khulna', 'Labanchara, Khulna'),
  ('Northern University of Business and Technology Khulna', 'university', 'private', 'Khulna', 'Mostofar More, Khulna'),
  ('Khan Bahadur Ahsanullah University, Khulna', 'university', 'private', 'Khulna', null);

-- ── Public Medical Colleges ─────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Khulna Medical College', 'medical_college', 'public', 'Khulna', 'Choto Boyra, Khulna'),
  ('Khulna Nursing College', 'medical_college', 'public', 'Khulna', 'Choto Boyra, Khulna');

-- ── Private Medical Colleges ────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Ad-Din Akij Medical College', 'medical_college', 'private', 'Khulna', 'Boikali, Khulna'),
  ('Khulna City Medical College', 'medical_college', 'private', 'Khulna', 'Moylapota, Khulna'),
  ('Khulna Homoeopathic Medical College', 'medical_college', 'private', 'Khulna', 'Moylapota, Khulna'),
  ('Gazi Medical College', 'medical_college', 'private', 'Khulna', 'Sonadanga, Khulna'),
  ('Khulna Mamota Nursing College', 'medical_college', 'private', 'Khulna', 'Fulbari Gate, Khulna');

-- ── Public Colleges ─────────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Govt. B.L. College', 'college', 'public', 'Khulna', 'Daulatpur, Khulna'),
  ('Azam Khan Govt. Commerce College', 'college', 'public', 'Khulna', 'Babu Khan Road'),
  ('Khulna Govt. Girls College', 'college', 'public', 'Khulna', 'Boyra, Khulna'),
  ('Govt. Pioneer Girls'' College, Khulna', 'college', 'public', 'Khulna', null),
  ('Govt. M.M. City College, Khulna', 'college', 'public', 'Khulna', null),
  ('Khulna Govt. Model School And College', 'college', 'public', 'Khulna', 'Boyra Khulna'),
  ('Khulna Government College', 'college', 'public', 'Khulna', 'Sonadanga, Khulna'),
  ('Govt. Sundarban Adarsha College, Khulna', 'college', 'public', 'Khulna', null),
  ('Govt. Bangabandhu College, Rupsha, Khulna', 'college', 'public', 'Khulna', 'Rupsha, Khulna'),
  ('Govt. Haji Mohammad Mohasin College', 'college', 'public', 'Khulna', 'Khalishpur, Khulna');

-- ── Private Colleges ────────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Khulna Public College', 'college', 'private', 'Khulna', 'Boyra, Khulna'),
  ('KDA school and College', 'college', 'private', 'Khulna', 'KDA Approach Rd, Khulna'),
  ('Bangladesh Navy School & College', 'college', 'private', 'Khulna', 'Goalkhali, Khulna'),
  ('Khulna Collegiate Girls'' School & College', 'college', 'private', 'Khulna', 'Rupsha, Khulna'),
  ('Islamia Degree College', 'college', 'private', 'Khulna', 'Boyra, Khulna'),
  ('Khulna College', 'college', 'private', 'Khulna', 'Sheikhpara, Khulna'),
  ('Daulatpur College (Day/Night)', 'college', 'private', 'Khulna', 'Daulatpur, Khulna'),
  ('Ahsanullah College', 'college', 'private', 'Khulna', 'Moylapota, Khulna'),
  ('Shaheed Sohrawardy College', 'college', 'private', 'Khulna', 'Banorgati, Khulna'),
  ('Saburunessa Girls'' College', 'college', 'private', 'Khulna', 'Gagan Babu Road, Khulna'),
  ('Sarowar Khan Degree College', 'college', 'private', 'Khulna', 'Senhati, Khulna'),
  ('Rayermohal Degree College', 'college', 'private', 'Khulna', 'Rayarmohol, Khulna'),
  ('Khan Jahan Ali Ideal College', 'college', 'private', 'Khulna', 'Shiromoni, Khulna'),
  ('Metropolitan College, Khulna', 'college', 'private', 'Khulna', 'Sonadanga Khulna');

-- ── Government Schools ──────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Khulna Zilla School', 'school', 'public', 'Khulna', null),
  ('Govt. Coronation Secondary Girls'' School', 'school', 'public', 'Khulna', null),
  ('Govt. Laboratory High School', 'school', 'public', 'Khulna', null),
  ('Khulna Govt. Girls'' High School', 'school', 'public', 'Khulna', 'Boyra, Khulna'),
  ('Govt. Daulatpur Muhsin High School', 'school', 'public', 'Khulna', null),
  ('Govt. Iqbal Nagar Girls'' High School', 'school', 'public', 'Khulna', null),
  ('Govt. Model High School', 'school', 'public', 'Khulna', null),
  ('K.D.A. Khan Jahan Ali Govt. High School', 'school', 'public', 'Khulna', null),
  ('Deldar Ahmed Govt. High School', 'school', 'public', 'Khulna', 'Khulna'),
  ('Salauddin Yusuf Govt High School', 'school', 'public', 'Khulna', 'Khulna'),
  ('Khulna Govt. Model School and College', 'school', 'public', 'Khulna', null),
  ('Khulna Power Station High school', 'school', 'public', 'Khulna', 'Khalispur, Khulna');

-- ── Non-government Schools ──────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Military Collegiate School Khulna', 'school', 'private', 'Khulna', 'Fultala, Khulna'),
  ('PMG High School', 'school', 'private', 'Khulna', 'Boyra'),
  ('St. Joseph''s High School', 'school', 'private', 'Khulna', 'Khulna'),
  ('Khulna Collegiate Girls'' School', 'school', 'private', 'Khulna', null),
  ('Islamabad Collegiate School', 'school', 'private', 'Khulna', null),
  ('Need School', 'school', 'private', 'Khulna', 'Sonadanga, Khulna'),
  ('Lions School', 'school', 'private', 'Khulna', 'Khulna'),
  ('SOS Herman miner school', 'school', 'private', 'Khulna', null),
  ('Rotary High School', 'school', 'private', 'Khulna', null),
  ('Port Secondary School', 'school', 'private', 'Khulna', 'Khulna'),
  ('Sristy Central School & College', 'school', 'private', 'Khulna', 'Khulna'),
  ('Bangabashi high school', 'school', 'private', 'Khulna', 'Khalishpur, Khulna'),
  ('National high school', 'school', 'private', 'Khulna', 'Khalishpur, Khulna'),
  ('Crescent Secondary high school', 'school', 'private', 'Khulna', 'Khalishpur, Khulna'),
  ('Navy Anchorage School and College', 'school', 'private', 'Khulna', 'Khulna'),
  ('Teligati High School', 'school', 'private', 'Khulna', 'Khulna'),
  ('S S R School', 'school', 'private', 'Khulna', 'Khulna');

-- ── Madrasah ────────────────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Khulna Alia Kamil Madrasah', 'madrasa', 'public', 'Khulna', null),
  ('Khulna Nesaria Kamil Madrasah', 'madrasa', 'public', 'Khulna', null),
  ('Darul Quran Siddiquia Kamil Madrasah', 'madrasa', 'public', 'Khulna', null),
  ('Shahid Sheikh Abu Naser Dakhil Madrasah', 'madrasa', 'public', 'Khulna', null),
  ('Darul Ulum Mosque and Madrasa', 'madrasa', 'public', 'Khulna', null);

-- ── IGV Schools ─────────────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('UCEP-K C C School', 'igv_school', 'private', 'Khulna', 'Rupsha'),
  ('UCEP-Sonadanga School', 'igv_school', 'private', 'Khulna', 'Sonadanga'),
  ('UCEP-M A Majid School', 'igv_school', 'private', 'Khulna', 'Fulbarigate'),
  ('UCEP-Khalishpur School', 'igv_school', 'private', 'Khulna', 'Khalishpur'),
  ('UCEP-Zohra Samad School', 'igv_school', 'private', 'Khulna', 'Tootpara'),
  ('UCEP-Wazed Ali School', 'igv_school', 'private', 'Khulna', 'Banorgati');

-- ── Technical Schools ───────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Technical Training Center Khulna', 'technical_school', 'public', 'Khulna', 'Fulbarigate, Khulna'),
  ('Khulna Shipyard Technical Training Center', 'technical_school', 'public', 'Khulna', 'Shipyard Main Road, Rupsha, Khulna'),
  ('Dumuria Govt. Technical School and College', 'technical_school', 'public', 'Khulna', null),
  ('UCEP-Mohsin Khulna Technical School', 'technical_school', 'private', 'Khulna', '7, Junction Road, Baikali, Khulna');

-- ── English Medium Schools ──────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Rosedale International English School', 'english_medium', 'private', 'Khulna', null),
  ('South Herald English Medium School', 'english_medium', 'private', 'Khulna', null),
  ('Morning Bell English Medium School', 'english_medium', 'private', 'Khulna', null),
  ('Tulip English School', 'english_medium', 'private', 'Khulna', null),
  ('Sunflower Tutorial', 'english_medium', 'private', 'Khulna', null),
  ('Elizabeth Primary School', 'english_medium', 'private', 'Khulna', null),
  ('Jahan International School', 'english_medium', 'private', 'Khulna', null);

-- ── Art College ─────────────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Khulna Art College', 'arts_college', 'public', 'Khulna', 'Khulna University');

-- ── Polytechnic Institutions ────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Sundarban Institute of Technology', 'polytechnic', 'private', 'Khulna', 'Boyra, Khulna'),
  ('Khulna Polytechnic Institute', 'polytechnic', 'public', 'Khulna', 'Khulna'),
  ('Hazrat Shahjalal Polytechnic Institute', 'polytechnic', 'private', 'Khulna', 'Khulna'),
  ('Khanjahan Ali College Of Science And Technology', 'polytechnic', 'private', 'Khulna', 'Khulna'),
  ('Khulna Technical And Engineering College', 'polytechnic', 'private', 'Khulna', 'Khulna'),
  ('Khulna Mohila Polytechnic Institute', 'polytechnic', 'public', 'Khulna', 'Khulna'),
  ('Mangrove Institute Of Science And Technology', 'polytechnic', 'private', 'Khulna', 'Khulna'),
  ('North South Polytechnic Institute', 'polytechnic', 'private', 'Khulna', 'Khulna'),
  ('City Polytechnic Institute', 'polytechnic', 'private', 'Khulna', 'Khulna'),
  ('Hope Polytechnic Institute', 'polytechnic', 'private', 'Khulna', 'Gollamari, Khulna'),
  ('Squire Polytechnic Institute', 'polytechnic', 'private', 'Khulna', 'Khulna'),
  ('Squire Medical Institute', 'polytechnic', 'private', 'Khulna', 'Khulna'),
  ('PSTI (Public Science & Technology Institute) Polytechnic Institute', 'polytechnic', 'private', 'Khulna', 'Khulna');

-- ── Military Schools ────────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Military Collegiate School Khulna (Patherbazar)', 'military_school', 'public', 'Khulna', 'Patherbazar, Phooltala, Khulna');
