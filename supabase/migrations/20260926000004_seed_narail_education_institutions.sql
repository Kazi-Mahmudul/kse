-- Seed the Narail education institutions list (Narail district only).
-- Source: docs/List of Institutes in Narail.md (a single mixed table — every
-- row classified by name into one of the schema enums).
--
-- Mirrors the Khulna / Satkhira / Jashore / Bagerhat / Magura seeds:
--   * type           — 'medical_college' for medical colleges (incl.
--                      homeopathic), 'arts_college' for fine-arts colleges,
--                      'college' for any degree / higher-secondary college
--                      (incl. mahavidyalaya, mohabiddyalay, technical
--                      school-and-college, agricultural & technical college,
--                      degree college), 'madrasa' for dakhil / alim / fazil /
--                      kamil / islamia / fa / ha madrasas, 'technical_school'
--                      for a free-standing technical institute, 'school'
--                      otherwise.
--   * ownership_type — 'public' for "Govt." / "Government" institutions
--                      (incl. Collectorate), 'private' otherwise. Strict
--                      rule: only the explicit "Govt" / "Government" marker
--                      flips the row to public. "Pilot" without "Govt" stays
--                      private — those can be revisited later if needed.
--   * city           — always 'Narail' (the picker filters by this column
--                      when the student picks Narail as their district)
--   * area           — upazila name (no "Narail" suffix, since city already
--                      says Narail).
--
-- Source-quality notes (kept as-written for traceability):
--   * "<br>" tags inside names are stripped.
--   * Apostrophes inside names are doubled for SQL ("GIRL'S" → "GIRL''S").
--   * Multiple consecutive spaces collapsed to one.
--   * Typographic typos preserved (e.g. "COLLAGE", "SECONDRY", "SCOOL",
--     "MADRASAH"/"MADRASA"/"MADRASHA"/"MADRSHA", "BIDDAPITH" → "BIDDYAPITH",
--     "COLLEGIA" → "COLLEGIA HIGH SCHOOL", "NARIL" → "NARIL").
--     These can be normalised in a follow-up migration if desired.
--
-- Re-running is safe: the partial unique index
--   (lower(name), coalesce(city, ''), type) WHERE is_active = true
-- dedupes identical active rows.
--
-- Upazila row counts:
--   * KALIA        — 52
--   * LOHAGARA     — 57
--   * NARAIL SADAR — 102
--   * Total        — 211

-- ── KALIA Upazila (52) ──────────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('J.A Chowdhury High School', 'school', 'private', 'Narail', 'Kalia'),
  ('Adarsha Sammilani U. Biddyapith', 'school', 'private', 'Narail', 'Kalia'),
  ('Baronal Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Bawshona Kamshia Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Bishnupur Hamidpur High School', 'school', 'private', 'Narail', 'Kalia'),
  ('C.M.B. Union Secondary School Bagudanga', 'school', 'private', 'Narail', 'Kalia'),
  ('Chanchuri Purulia Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Datta Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Debdun Babul Jannat Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Fazel Ahmed Scondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Habibul Alam Bir Protic College', 'college', 'private', 'Narail', 'Kalia'),
  ('Islami Adarsha Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Islampur Islamia Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('J.M.P. Altaf Molla Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Jadabpur Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Jaynal Abedin Nurunnahar Junior Girls School', 'school', 'private', 'Narail', 'Kalia'),
  ('Jogania D.N. High School', 'school', 'private', 'Narail', 'Kalia'),
  ('Kalabaria High School', 'school', 'private', 'Narail', 'Kalia'),
  ('Kalabaria Sree Nagar Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Kalia Alim Madrasah', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Kalia Govt. Pilot Model Secondary School', 'school', 'public', 'Narail', 'Kalia'),
  ('Kalia P.S. Girls High School', 'school', 'private', 'Narail', 'Kalia'),
  ('Khamar Paro Khali B.L. High School', 'school', 'private', 'Narail', 'Kalia'),
  ('Khararia Secondary Girls School', 'school', 'private', 'Narail', 'Kalia'),
  ('Khararia A.G.M. High School', 'school', 'private', 'Narail', 'Kalia'),
  ('Khararia Rahima Habib Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Khashial Islamia Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('L R M Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Mahajan Gashibarya Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Mauli Panchapolly High School', 'school', 'private', 'Narail', 'Kalia'),
  ('Little Jewels Somobaye School', 'school', 'private', 'Narail', 'Kalia'),
  ('Modhumoti Technical and Commercial College', 'college', 'private', 'Narail', 'Kalia'),
  ('Monoranjan Kapuria College', 'college', 'private', 'Narail', 'Kalia'),
  ('Munshi Manik Miah College', 'college', 'private', 'Narail', 'Kalia'),
  ('Naragati College', 'college', 'private', 'Narail', 'Kalia'),
  ('New Model Academy', 'school', 'private', 'Narail', 'Kalia'),
  ('Nowgram Jr. Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Pachgram Osman Goni Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Palli Mangal Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Panchogram Junior High School', 'school', 'private', 'Narail', 'Kalia'),
  ('Panchopolly Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Ragunathpur Girls High School', 'school', 'private', 'Narail', 'Kalia'),
  ('Rampur Rasulpur Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Salamia Imamia Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Shahbag United Academy', 'school', 'private', 'Narail', 'Kalia'),
  ('Shaheed Abdus Salam Govt. Degree College', 'college', 'public', 'Narail', 'Kalia'),
  ('Shahid Eklashuddin Ahmed Secondary School', 'school', 'private', 'Narail', 'Kalia'),
  ('Shiekh Fazilatunesa Mujib Girls High School', 'school', 'private', 'Narail', 'Kalia'),
  ('The Patna Academy', 'school', 'private', 'Narail', 'Kalia'),
  ('Tona Islamia Alim Madrasa', 'madrasa', 'private', 'Narail', 'Kalia'),
  ('Kalia Government Technical School and College, Narail', 'college', 'public', 'Narail', 'Kalia'),
  ('Alhaj Ishak Ali Technical Institute', 'technical_school', 'private', 'Narail', 'Kalia');

-- ── LOHAGARA Upazila (57) ───────────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('A.B.N.K Adarsha Girls School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Al Zamiatul Islamia Alim Madrasa', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Amada Adarsha College', 'college', 'private', 'Narail', 'Lohagara'),
  ('Amada Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Amada High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Amdanga Adharsha Secondry School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Bordia Multilateral High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Brammondanga Sammulita Technical Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Chachai Dhanair Secondary School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Chachai Secondary School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Chakulia Junior High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Chapulia Babussunnat Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Dighalia Adarsha Secondary School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Emdad Honjo Ideal Girls School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Hazi Mofazzel Smarani Secondary School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Itna Girls High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Itna Madhyamik Bidyalaya and College', 'college', 'private', 'Narail', 'Lohagara'),
  ('J.C.G. Secondry School', 'school', 'private', 'Narail', 'Lohagara'),
  ('K D R K Secondary School', 'school', 'private', 'Narail', 'Lohagara'),
  ('K N P Junior High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('K T M High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Kashipur A.C. Secondary School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Kotakole Baytul Falah Dakhil Madrsha', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Kumri Talbaria Hamidia Alim Madrasa', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('L.S.J.N Union Institution', 'school', 'private', 'Narail', 'Lohagara'),
  ('Lahura Azizur Rahman Secondary High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Lahuria Hafaz Abdul Karim Academy', 'school', 'private', 'Narail', 'Lohagara'),
  ('Lahuria Siddiquia Fazil Madrasah', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Lakshmi Pasha Ideal Womens Degree College', 'college', 'private', 'Narail', 'Lohagara'),
  ('Lakshmipasha Adarsha Bidyalaya', 'school', 'private', 'Narail', 'Lohagara'),
  ('Lohagara Girls Secondary School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Lohagara Govt. Pilot High School', 'school', 'public', 'Narail', 'Lohagara'),
  ('Lohagara Govt. Adarsha Mahavidyalaya', 'college', 'public', 'Narail', 'Lohagara'),
  ('Lohagara Lakshmipsha Pilot Girls High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Lohagara M.A. Haq Karigari and Banizzik Mahavidyalaya', 'college', 'private', 'Narail', 'Lohagara'),
  ('Maitkumra Kalna Mitali High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Makrail Karim Khalek Solaiman Institution', 'school', 'private', 'Narail', 'Lohagara'),
  ('Mallikpur Union Secondary School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Mithapur M.L. High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Morichpasha High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Nabaganga Degree College', 'college', 'private', 'Narail', 'Lohagara'),
  ('Nakhkhali Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Nalidi B.S.S. Institution', 'school', 'private', 'Narail', 'Lohagara'),
  ('Pachuria High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('R.K.K. Janata Secondary High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('S.H.B.R Alim Madrasa', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('S.M.A Ahad College', 'college', 'private', 'Narail', 'Lohagara'),
  ('Saptopalli Junior Secondary School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Sarasati Academy', 'school', 'private', 'Narail', 'Lohagara'),
  ('Shairbor Aziz Ashraf Junior High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Shalnagor Modern Academy', 'school', 'private', 'Narail', 'Lohagara'),
  ('Shatodal High School', 'school', 'private', 'Narail', 'Lohagara'),
  ('Shorusuna Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Sonadah Panchuria Baria Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Sujapur N.M.M. Bahumuki Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Jalalshi Nowapara Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Lohagara'),
  ('Rigia Yousuf Girls High School', 'school', 'private', 'Narail', 'Lohagara');

-- ── NARAIL SADAR Upazila (102) ──────────────────────────────────────────────
insert into public.education_institutions (name, type, ownership_type, city, area)
values
  ('66 No. Ramshiddhi Govt. Primary School', 'school', 'public', 'Narail', 'Narail Sadar'),
  ('A. B. M Jr Girl''s High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('A.B.N.R High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('A.M.C.R. Samutulla Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('A.P.B.S.L. Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Abdul Hye City College, Narail', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('ABS Memorial Secondary School, Nakoshi', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Afra Dhakhil Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Afra High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Agdia Bichali Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Agdia Girls Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Agdia Shimulia High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Alokdia Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Ashar Allo College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('B. R. D. Adarsha Junior High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('B.B.S. Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Bahirgram High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Baliadanga Junior Girl''s Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Ballartop Ideal College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Ballartope High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Baman Hat High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Barasula Shesusadan Complex Cadet High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Barshula Shisu Sadan Complex Cadet Alim Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Basgram Bishnopur High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Bersrasto Nur Mohammad Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Bichali High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Bijoypur Islamia Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Birshresta Nur Mohammad Mohabiddyalay', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Boramara Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('C. R. M. High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Chanchra Darul Ulum Alim Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Chanchra N.U.B. High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Charikhara Girls High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Dakhin Narail Shimulia College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Dariapur Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Daskin Bagdanga Azizul Haque School and College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Dattapara Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Debbhog High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Debbhog Junior Girls High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Debepur High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Gobra Mitra College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Gobra Parbati Bidyapith', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Gobra Progati Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Gobra Women''s College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Guakhola High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Habokhali Adrasaho Mohabiddalay', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Habokhali Hamidunnesa Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Hizal Danga High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Islamabad Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Juralia Alim Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Juralia Bahumukhy Adrsha College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Juralia J.B.M High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('K.D.M Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('K.D.M.S. Darus Sunnah Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Kamal Protap S.J. Union Institution', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Krisnolota Girls Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Laskarpur Simakhaly Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Maij Para College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Maizpara Adarsha Girls High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Maizpara Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Maliat Girls High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Maliat Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Miagpara U.P. Durgapur Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Mira Para High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Mirzapur Hazi Bari Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Mirzapur High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Mirzapur United College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Muldair Tal Tala Girls High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Mulia High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Narail Govt Mohila College', 'college', 'public', 'Narail', 'Narail Sadar'),
  ('Narail Agricultural and Technical College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Narail Govt. Girls High School', 'school', 'public', 'Narail', 'Narail Sadar'),
  ('Narail Govt. High School', 'school', 'public', 'Narail', 'Narail Sadar'),
  ('Narail Homeopathic Medical College and Hospital, Narail', 'medical_college', 'private', 'Narail', 'Narail Sadar'),
  ('Narail Islamia Fazil Madrasa', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Narail Technical School and College', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('Narail Govt. Victoria College', 'college', 'public', 'Narail', 'Narail Sadar'),
  ('ORCD Business Management Institute', 'college', 'private', 'Narail', 'Narail Sadar'),
  ('P.B.M. Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Palaidanga Dakhil Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Paura Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Peroly Dakhil Madrasa', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('R.B.F.M Bhabanipur High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Ratadanga High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('S.M. Sultan Bengal Charukala Mohabidyalay', 'arts_college', 'private', 'Narail', 'Narail Sadar'),
  ('Sammilani Secondary School Chalita Tala', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Shahabad Mazidia Mahila Madrasa', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Shahabad Majidia Kamil Madrasah', 'madrasa', 'private', 'Narail', 'Narail Sadar'),
  ('Shahabad Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Sheikhati Tapanbhag United High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Shekhata Jr. Girls High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Shib Sankar Girl''s High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Shimultala Girls High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Singa Salpur K.P. High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Singia Secondary School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Tabra Naba Krishna High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Trimohani High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Tularampur High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Tularampur Ideal Girls High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Uzipur High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Victoria Collegia High School', 'school', 'private', 'Narail', 'Narail Sadar'),
  ('Narail Collectorate School', 'school', 'public', 'Narail', 'Narail Sadar');
