-- Seed the Meherpur education institutions list (Meherpur district only).
-- Source: docs/List of Institutes in Meherpur.md (a single mixed table —
-- every row classified by name into one of the schema enums).
--
-- Mirrors the Khulna / Satkhira / Jashore / Bagerhat / Magura / Narail /
-- Kushtia / Chuadanga seeds:
--   * type           — 'university' for universities (Meherpur University),
--                      'polytechnic' for state engineering colleges
--                      (Meherpur College of Engineering and Technology),
--                      'college' for any degree / higher-secondary college
--                      (incl. mohabiddalay, technical school-and-college,
--                      school-and-college, business management college),
--                      'madrasa' for dakhil / alim / fazil / darul ulum /
--                      islamia madrasas, 'technical_school' for free-standing
--                      technical / vocational / computer training centers /
--                      science & technology institutes / agriculture diploma
--                      colleges (Krishi Projukti College) / medical technology
--                      institutes (Institute of Medical Technology), 'school'
--                      otherwise (incl. MUNSUR ACADEMY, SHIKHYA MANJIL).
--                      Shikhya Manjil treated as school (educational
--                      institution at secondary level); Mohabiddaloy treated
--                      as college (degree-level). St.Xavier / missionary
--                      schools marked private.
--   * ownership_type — 'public' for "Govt." / "Government" institutions
--                      and for the public Meherpur University. 'private'
--                      otherwise (incl. Pilot Schools without explicit Govt
--                      prefix, per the established strict reading).
--   * city           — always 'Meherpur' (the picker filters by this column
--                      when the student picks Meherpur as their district)
--   * area           — upazila name (no "Meherpur" suffix, since city
--                      already says Meherpur).
--
-- Source-quality notes (kept as-written for traceability):
--   * "<br>" tags inside names are stripped.
--   * Multiple consecutive spaces collapsed to one.
--   * Typographic typos preserved (e.g. "MASRASHA"/"MADRASAH",
--     "KAMRMDI", "SHANGHAT", "SHAHAR BATI KOLONI PARA", "TANTUL BARIA",
--     "TERAIL-JOREPUKURIA", "LUTFUNNESA", "BHOMORDHA DHARMOCHAKI",
--     "HARABHANGA", "GARADOB", "MIKUSHIS", "ASMAN KHALI"-style spellings).
--     Easy to normalise in a follow-up if desired.
--
-- Re-running is safe: the partial unique index
--   (lower(name), coalesce(city, ''), type) WHERE is_active = true
-- dedupes identical active rows.
--
-- Upazila row counts:
--   * GANGNI         — 90
--   * MEHERPUR SADAR — 67
--   * MUJIB NAGAR    — 26
--   * Total          — 183

-- ── GANGNI Upazila (90) ──────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Aida Kalim Dakhil Madrasa', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Al Madina Dakil Madrasa', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Amtoil High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Arpara High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('B B N Junior High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('B N College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('B.P.N. Junior Girls School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('B.T.D High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Badiapara Mohobbotpur High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Badiapara Mohsinia Siddkia Dakhil Masrasha', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Baliaghat Govt. Primary School', 'school', 'public', 'Meherpur', 'Gangni'),
  ('Bamondil Dakhil Madrasah', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Bamondil Nishipur School and College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('Bamondil Secondary Girls School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Bansbaria High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Baot Adarsha Girls High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Baot Solaimani High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Betbaria High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Bhat Para High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Bhat Para Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Bhomordha Dharmochaki BD High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('C.F.M. Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Chandpur Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Chitla High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('D.J.M.C High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Dhala High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Dhankhola High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Dhankhola Technical and Business Management Institute', 'technical_school', 'private', 'Meherpur', 'Gangni'),
  ('Gangni Pilot Secondary Girls School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Gangni Mohila Degree College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('Gangni Pilot Secondary School and College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('Gangni Pouro Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Gangni Pre Cadet and Junior High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Gangni Siddikia Senior Alim Madrasah', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Gangni Technical and Business Management College', 'technical_school', 'private', 'Meherpur', 'Gangni'),
  ('Garabarina Junior Girls High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Garadob Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Govt. Gangni Degree College', 'college', 'public', 'Meherpur', 'Gangni'),
  ('H.B. High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Hinda, Mailmari, Hijolbaria, Bhomordah Girls High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('H.S.K. Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Harabhanga Adarsha Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Harabhanga D H Senior Fazil Madrasa', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Harabhanga Junior Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Hariadha Mohisha Khola Junior School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Hijalbaria Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Hogalbaria-Mohammadpur Haji Bharash Uddin Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('J. T. S. Girls High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Jorepukuria Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Jothy High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Juginda High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Jugir Gofa Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('K.A.B. High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('K.N.S.H. Girls Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Kamrmdi Darussunna Nesaria Dakhil Madrasa', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Karamdi College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('Karamdi Kallanpur Girls High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Karamdi Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Kazipur College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('Kazipur Darul Ulum Dakil Madrasah', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Kazipur High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Kazipur Mathabhanga Girls High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Kumari Danga Secondary High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Kutubpur High School and College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('Lutfunnesa Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('M B K High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('M.G.G.M. High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('M.H.A. Secondary Girls School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Manikdia Agarpara Dakhil Madrasa', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Mikushis Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Mohammadpur Adorsha High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Morka Jagoran College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('Motmura Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('N.P. High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Pirtala Ideal Junior High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Pirtola Dakil Madrasa', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('R.B.G.M. High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Raipur Multilateral Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('S.A.R.B Junior High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('S.K.R.S Girls High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('S.K.S Secondary School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Saheb Nagar High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Shahar Bati Koloni Para Alnarkazul Dakil Madrasa', 'madrasa', 'private', 'Meherpur', 'Gangni'),
  ('Shaharbati Ibadatkhana High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Shandhani School and College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('Shanghat Chandamary High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('T.R.I.M Junior Girls High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Tantul Baria Islamia High School', 'school', 'private', 'Meherpur', 'Gangni'),
  ('Terail-Jorepukuria Degree College', 'college', 'private', 'Meherpur', 'Gangni'),
  ('Meherpur University', 'university', 'public', 'Meherpur', 'Gangni');

-- ── MEHERPUR SADAR Upazila (67) ──────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('A L M Ziaul Hoque Friends Foundation School and College', 'college', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('A R B Degree College', 'college', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Amjhupi Alim Madrasah', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Amjhupi Girls High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Amjhupi Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Ashrafpur Darus Sunnah Dakhil Madrasah', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Ashrafpur High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Baliarpur Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Baribaka Simanto Girls Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Barshibaria High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Begum Badrunnesa Technical and Business Management College', 'technical_school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Bhairab Girls High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('C.H.S High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('C.M C Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Chak Shyam Nagar Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Genius Laboratory School and College', 'college', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Gopalpur Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Govipur Dakhil Madrasah', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Govipur Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Hati Bhanga High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Horirampur High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Institute of Medical Technology', 'technical_school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Islamnogor Hosainia Dakil Madrasa', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Jadukhali School and College', 'college', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Jhaubaria Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('K R R S High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Kabi Nazrul Shikhya Manjil', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Kali Gangni Junior High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Kamdeb Pur High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Kazi Qudrutul Islam Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Kola Dakhil Madrasa', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Kolmizol Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Krishi Projukti College Meherpur', 'technical_school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Kulbaria Dakhil Madrasah', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Kulbaria Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur Girls School and B.M College', 'college', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur College of Engineering and Technology', 'polytechnic', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur Darul Ulum Ahmadia Fazil Madrasah', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur Govt College', 'college', 'public', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur Govt. Girls High School', 'school', 'public', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur Govt. High School', 'school', 'public', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur Govt. Mohila College', 'college', 'public', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur Mohila Dakhil Madrasa', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur Technical and Business Management Institute', 'technical_school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Meherpur Technical School and College, Meherpur', 'technical_school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Modna Danga Girls High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Mominpur Secondary Girls School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Mominpur Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Muktijuddha Ahmed Ali Technical and Business Management College, Meherpur', 'technical_school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Natun Darbeshpur Dakhil Madrasa', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Pirojpur Dakil Madrasa', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Pirujpur Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Pouro Junior Girls School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('R.R. Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Raipur Govt. Primary School', 'school', 'public', 'Meherpur', 'Meherpur Sadar'),
  ('Rajnogor Dakil Madrasa', 'madrasa', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Shahebp Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Shalika Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Shimanto Girls High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Sholmari High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Sholmari Secondary Girls High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Shyampur Shalika Secondary Girls School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Sohiuddin Degree College', 'college', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Subidpur High School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Tengramari Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Ujalpur Secondary School', 'school', 'private', 'Meherpur', 'Meherpur Sadar'),
  ('Daffodil School and College', 'college', 'private', 'Meherpur', 'Meherpur Sadar');

-- ── MUJIB NAGAR Upazila (26) ─────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('A.T.J Adarsho Girls High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Adarshaw High School Shibpur', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('An-Noor Technical and B.M College', 'technical_school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Ananda Bash Mia Munsur Academy', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Anandabas Girls High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Ayesha Nagar Dakhil Madrasa', 'madrasa', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Bagowan High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Bollovpur Mission Junior High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Daria Pur Girls High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Daria Pur Gousia Dakhil Madrasa', 'madrasa', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Dariapur Secondary School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Gopal Nagar Secondary Girls School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Govt. Mujib Nagar Degree College', 'college', 'public', 'Meherpur', 'Mujib Nagar'),
  ('Joypur Taranagar High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Kamorpur High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Mahajanpur Mohabiddaloy', 'college', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Manik Nagar D. S. Aminia Alim Madrasa', 'madrasa', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Mohajonpur High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Monakhali High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Mujib Nagar Govt. Secondary School', 'school', 'public', 'Meherpur', 'Mujib Nagar'),
  ('Mujibnagar Adarsha Mohila College', 'college', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Mujibnagar Amrokanan High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Mujibnagar Model Govt. Primary School', 'school', 'public', 'Meherpur', 'Mujib Nagar'),
  ('Shibpur Darul Quran Dakhil Madrasa', 'madrasa', 'private', 'Meherpur', 'Mujib Nagar'),
  ('St.Xavier Junior High School', 'school', 'private', 'Meherpur', 'Mujib Nagar'),
  ('Mujibnagar Technical School and College Meherpur', 'technical_school', 'private', 'Meherpur', 'Mujib Nagar');
