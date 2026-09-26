-- Seed the Chuadanga education institutions list (Chuadanga district only).
-- Source: docs/List of Institutes in Chuadanga.md (a single mixed table —
-- every row classified by name into one of the schema enums).
--
-- Mirrors the Khulna / Satkhira / Jashore / Bagerhat / Magura / Narail /
-- Kushtia seeds:
--   * type           — 'university' for universities (incl. First Capital
--                      University of Bangladesh), 'medical_college' for
--                      medical colleges (none in this district), 'polytechnic'
--                      for polytechnic institutes, 'college' for any degree /
--                      higher-secondary college (incl. mahavidyalaya,
--                      mohabiddyalay, technical school-and-college,
--                      agricultural college, nursing institute, business
--                      management institute, English-version school-and-
--                      college, model school-and-college), 'madrasa' for
--                      dakhil / alim / fazil / kamil / darul ulum / islamia
--                      madrasas, 'technical_school' for free-standing
--                      technical / vocational / computer training centers /
--                      science & technology / medical technology
--                      institutes, 'school' otherwise. Collectorate /
--                      Govt. / Government rows are marked public; "Pilot"
--                      without "Govt" stays private.
--   * ownership_type — 'public' for "Govt." / "Government" institutions and
--                      for institutional entities run by the state
--                      (Collectorate, P.T.I. — Primary Teachers' Training
--                      Institute). 'private' otherwise.
--   * city           — always 'Chuadanga' (the picker filters by this column
--                      when the student picks Chuadanga as their district)
--   * area           — upazila name (no "Chuadanga" suffix, since city
--                      already says Chuadanga).
--
-- Source-quality notes (kept as-written for traceability):
--   * "<br>" tags inside names are stripped.
--   * Apostrophes inside names are doubled for SQL ("GIRL'S" → "GIRL''S").
--   * Multiple consecutive spaces collapsed to one.
--   * Typographic typos preserved (e.g. "SHOOL", "BIDDYAPIT",
--     "MADRASAH"/"MADRASHA", "MULITILATERAL" → "MULTILATERAL",
--     "MULTILAATER", "KHOSTAR", "SARANI", "D.A.S.S", "SCOOL",
--     "MOBIDDYALAY"/"BIDDYALAY"/"MOHABIDDYALYA"). Easy to normalise in a
--     follow-up if desired.
--
-- Re-running is safe: the partial unique index
--   (lower(name), coalesce(city, ''), type) WHERE is_active = true
-- dedupes identical active rows.
--
-- Upazila row counts:
--   * ALAMDANGA       — 78
--   * CHUADANGA SADAR — 63
--   * DAMURHUDA       — 54
--   * JIBAN NAGAR     — 37
--   * Total           — 232

-- ── ALAMDANGA Upazila (78) ──────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Gokul Khali Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Ail Hash Lakhipur High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Alamdanga Govt. Pilot High School', 'school', 'public', 'Chuadanga', 'Alamdanga'),
  ('Alamdanga Govt. Degree College', 'college', 'public', 'Chuadanga', 'Alamdanga'),
  ('Alamdanga Mohila Degree College', 'college', 'private', 'Chuadanga', 'Alamdanga'),
  ('Alamdanga Pilot Secondary Girls School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Alamdanga Siddiquia Alim Madrasah', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Asman Khali Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bademaju Badal Smrity Academy', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bakshipur Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bara Gangni High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bashira Malik Dawki Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Batiapara Shialmari High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Belgachi Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bhangbaria Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bhangbaria Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bhodua Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bhogail Bagidi High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bondabil Govt. Primary School', 'school', 'public', 'Chuadanga', 'Alamdanga'),
  ('Borogangni Nasrul Ulum Siddiquea Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Bright Model School and College', 'college', 'private', 'Chuadanga', 'Alamdanga'),
  ('C. H. R Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Dr. Afsar Uddin College', 'college', 'private', 'Chuadanga', 'Alamdanga'),
  ('Enayetpur Baradi Alhaj Mir Khostar Ali Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Ershadpur Academy', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Gholadari Bazar High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Gholdari Bazar Secondary Girls School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Goshbila High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Hardi Mir Samsuddin Ahmed Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Harokandi Baleswarpur High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Hatboalia Girls High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Hatboalia Higher Secondary School and College', 'college', 'private', 'Chuadanga', 'Alamdanga'),
  ('J. C. B High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('J.S. High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Jamjami Secondary Girls School and College', 'college', 'private', 'Chuadanga', 'Alamdanga'),
  ('K.G.B Dakil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('K.U.P. Ha: Shi Balika Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Kabil Nagor Nasrul Ulum Alim Madrasah', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Kamlapur P.T.I. Chuadanga', 'technical_school', 'public', 'Chuadanga', 'Alamdanga'),
  ('Kata Bhanga High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Kayet Para High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Keshobpur Junior Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Khajurtala Bazar Jr. School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Khash Karara College', 'college', 'private', 'Chuadanga', 'Alamdanga'),
  ('Khash Karara High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Khashkarara Secondary Girls School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Kumary Union High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('M S Huda Institute of Medical Technology', 'technical_school', 'private', 'Chuadanga', 'Alamdanga'),
  ('M S Zoha College', 'college', 'private', 'Chuadanga', 'Alamdanga'),
  ('M. S. Zoha Krishi College', 'college', 'private', 'Chuadanga', 'Alamdanga'),
  ('M. Sobed Ali Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Madhab Pur Model High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Mir Samsul Alam Islam Polytechnic Institute', 'polytechnic', 'private', 'Chuadanga', 'Alamdanga'),
  ('Munshiganj Academy', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Munshiganj Girls High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Nagdah High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Nargis Islam Girls High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Natidanga Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Nigar Siddik Degree College', 'college', 'private', 'Chuadanga', 'Alamdanga'),
  ('Nimtola Adarsha Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Nippon Zoha Technical School (S.S.C. Voc)', 'technical_school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Nowlamary Fazil (Degree) Madrasah', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Osmanpur Laxmipur Junior Girls High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Osmanpur Pragpur High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Osmanpur Pragpur Siddiqia Fazil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Paikpara Jana Kalyan Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Panch Kamala Pur Aliat Nagar High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Panchlia Jamal Uddin High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Polta Danga High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Prime Institute of Science and Technology', 'technical_school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Sampur Islamia Dakil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Shapta Gram High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Shebabag Secondary School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Sirajul Islam Joarder Model Nimno Maddhomik Biddaloy', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Srijonee Model High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Tiorbila High School', 'school', 'private', 'Chuadanga', 'Alamdanga'),
  ('Ummul Muminun Alamdanga Dakhil Girls Madrasa', 'madrasa', 'private', 'Chuadanga', 'Alamdanga'),
  ('Alamdanga Academy', 'school', 'private', 'Chuadanga', 'Alamdanga');

-- ── CHUADANGA SADAR Upazila (63) ────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('62 No Aria Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Adarsha Govt. Mahila College', 'college', 'public', 'Chuadanga', 'Chuadanga Sadar'),
  ('Al-Helal Secondary Islami Academy', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Aliarpur Aziz High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Alukdia Romela Girls High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Arafat Hossain Sarani Biddyapit', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Badarganj Baqui Billah Kamil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Badarganj Degree College', 'college', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Begukmpur Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Begumpur Jodupur High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Boro Salua New Model College', 'college', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Central Commercial Training Center', 'technical_school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Academy', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Adarsha High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Adorsha Uccha Balika Vidyalaya', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Collectorate School and College', 'college', 'public', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Fazil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Govt. College', 'college', 'public', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Govt. Girls High School', 'school', 'public', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Mohila Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Polytechnic Institute', 'polytechnic', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chuadanga Technical School and College', 'college', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Chudanga Poura College', 'college', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Compact Computer Training Center', 'technical_school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Dingadah Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Dingadah Secondary Girls School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('First Capital University of Bangladesh', 'university', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Gaidghat Govt. Primary School', 'school', 'public', 'Chuadanga', 'Chuadanga Sadar'),
  ('Girishnagar High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Gold Star Computer', 'technical_school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Hazrahati Darul Islam Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Hazrahati Taltala High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Hizalgari Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Jhinuk Girls Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Jugir Huda Abul Hossen Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Kathuly Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Kharagoda Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Kotal High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Kukiachandpur Ideal Girls High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('M.A. Bari Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Makhal Danga Dennath Pur High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Mohammad Joma D.A.S.S Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('New Ideal Medical Institute and Technology', 'technical_school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Nilmoniganj Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Nilmonigonj Secondary Girls School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Nursing Institute Chuadanga', 'college', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Rahela Khatun Girls Academy', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Sademannesa Girls High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Sara Baria Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Sarabaria Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Sarojgong High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Shaheed Muktijoddha Smiti Non Gov Business Management Institute', 'college', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Shemanto High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Sohrawardi Sarani Viddyapit Dingadah', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Srikol-Boalia High School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Tatul Sheikh College', 'college', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Titudah Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('V.J. Govt. High School, Chuadanga', 'school', 'public', 'Chuadanga', 'Chuadanga Sadar'),
  ('Vqueen''s Institute of Technology', 'technical_school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Dr Atiqur Rahman Malik English School and College', 'college', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Amena Khatun Secondary School', 'school', 'private', 'Chuadanga', 'Chuadanga Sadar'),
  ('Akondobaria Model School and College', 'college', 'private', 'Chuadanga', 'Chuadanga Sadar');

-- ── DAMURHUDA Upazila (54) ──────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Abdul Wadud Shah Degree College', 'college', 'private', 'Chuadanga', 'Damurhuda'),
  ('Al-Hera Islami High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Barabaldia School and College', 'college', 'private', 'Chuadanga', 'Damurhuda'),
  ('Bastopur Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Bishnupur Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Buchitala Barabaldia Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Carew High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Charulia Junior High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Dakshin Chandpur Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Daliarpur Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Damur Huda D.S. Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Damurhuda Madhyamik Biddyalay', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Damurhuda Pilot Girl''s School and College', 'college', 'private', 'Chuadanga', 'Damurhuda'),
  ('Damurhuda Pilot High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Darsana D.S. Fazil Degree Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Darsana Girls High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Darsana Govt. College', 'college', 'public', 'Chuadanga', 'Damurhuda'),
  ('Gobinda Huda Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Gopal Pur Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Hogaldanga High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Hogoldanga College', 'college', 'private', 'Chuadanga', 'Damurhuda'),
  ('Jagannathpur Balika Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Jayrampur High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Joyrampur D.S. Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Juran Pur Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Kalabari Ramnagar High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Kamarpara High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Kanaidanga High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Karpas Danga Islamia Fazil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Karpasdanga H.U Girls Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Karpash Danga Mohabiddyalya', 'college', 'private', 'Chuadanga', 'Damurhuda'),
  ('Karpash Danga Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Karpashdanga Secondary Girl''s School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Kunia Chandpur Siddikia Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Kurul Gachi Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Damurhuda'),
  ('Kurul Gachi Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Kutubpur Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Lokenath Pur S.S. High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Madna Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Memnagar Biprodas Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Mokterpur Secondary Girls'' School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Natipota High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Natuda Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Patachora Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Pirpurkulla Secondary High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Sadabori High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Sayapoth Computer Training Center', 'technical_school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Talshari Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Thakurpur Pirpur Kulla High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Umbath Biswas Junior High School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Uzirpur Govt. Primary School', 'school', 'public', 'Chuadanga', 'Damurhuda'),
  ('Chandipur Junior Secondary Girls School', 'school', 'private', 'Chuadanga', 'Damurhuda'),
  ('Darsana Ideal School and College', 'college', 'private', 'Chuadanga', 'Damurhuda'),
  ('Subulpur Junior Secondary School', 'school', 'private', 'Chuadanga', 'Damurhuda');

-- ── JIBAN NAGAR Upazila (37) ────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('Andulbaria Ashrafia Alim Madrasah', 'madrasa', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('31 No. Horihornagar Govt. Primary School', 'school', 'public', 'Chuadanga', 'Jiban Nagar'),
  ('Alipur Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Andul Baria College', 'college', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Andul Baria Multilaater Girls High School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Andul Baria Multilateral Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Arena Computer Education', 'technical_school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('B.C.K.M.P Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Dhopa Khali High School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Govt. Jibonnagar Adarsha Mohilla Degree College', 'college', 'public', 'Chuadanga', 'Jiban Nagar'),
  ('Goyeshpur Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Haji Monir Hossain Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Hasadah Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Hashadah Model Fazil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Hashadah Secondary Girls School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Jannatul Khadra Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Jiban Nagar Degree College', 'college', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Jiban Nagar Thana Alim Madrasa', 'madrasa', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Jibon Nagar Thana M.L. High School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Jibonnagar Technical School and College', 'college', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Jibonnagar Thana Govt. Pilot Secondary Girl''s School', 'school', 'public', 'Chuadanga', 'Jiban Nagar'),
  ('Karatoa Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Kashem Ali High School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Kashipur Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Madhabpur Islamia Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Minajpur Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Monohar Pur Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Nehinqundu Barandi Dakhil Madrasah', 'madrasa', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Panka Darus Salam Dakhil Madrasa', 'madrasa', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Panka High School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Raipur High School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Shahapur High School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Shaplakali Adarsha Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Singnagar High School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Uthali College', 'college', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Uthali Secondary Girls School', 'school', 'private', 'Chuadanga', 'Jiban Nagar'),
  ('Uthali Secondary School', 'school', 'private', 'Chuadanga', 'Jiban Nagar');
