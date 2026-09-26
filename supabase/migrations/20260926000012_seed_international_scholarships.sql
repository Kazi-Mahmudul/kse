-- International scholarship seed (40 rows).
--
-- Source: C:/Users/mahmu/Downloads/Bangladesh_Scholarship_Database_Requirements_and_Apply_Now.xlsx
-- Sheet:  BD_Master_List (rows 2-41), curated manually by KSE staff from each
--         scholarship's official country page / call documents.
--
-- Schema additions required (run BEFORE this file):
--   * 20260926000011_opportunities_deadline_note.sql  — adds the
--     `opportunities.deadline_note text` column and rebuilds the search
--     vector to include it.
--
-- Why these specific mappings:
--   * `type = 'scholarship'`            — uses the existing enum value
--                                         (no schema change needed).
--   * `country = <Country/Region>`       — destination country, e.g. 'UK',
--                                         'Germany'. Drives the Scholarship
--                                         Hub's "Local" / "International"
--                                         chips via the existing
--                                         `country` / `countryNot` filters.
--                                         Local (BD) scholarships continue
--                                         to set country = 'Bangladesh'.
--   * `degree_level`                    — top-level single enum value
--                                         picked from the prose range.
--                                         The full range is preserved on
--                                         the joined `opportunity_eligibility`
--                                         row (`degree_levels[]`) so the
--                                         matching engine can still decide
--                                         eligibility across the span.
--   * `funding_type`                    — 'full' for "Fully funded" /
--                                         comprehensive coverage, 'partial'
--                                         for funded-but-not-fully,
--                                         NULL for "Varies".
--   * `deadline`                        — concrete next apply-by date
--                                         (Chevening 2026-10-06,
--                                         Maastricht 2027-02-01) where the
--                                         source named an upcoming date.
--                                         NULL elsewhere so expiry jobs do
--                                         not auto-hide the row.
--   * `deadline_note`                   — verbatim "Deadline / Status Note"
--                                         from the spreadsheet. Surfaced on
--                                         the Scholarship card and detail
--                                         page when `deadline` is NULL.
--   * `opportunity_eligibility.countries`     — '{Bangladesh}' (all 40 are
--                                               open to Bangladeshi students).
--   * `opportunity_eligibility.nationalities` — '{Bangladeshi}'.
--
-- Idempotency: this file is a one-time seed. The opportunities table does
-- not have a unique constraint on (type, title), so re-running will duplicate
-- rows. Delete the previously-seeded scholarship rows first if you need to
-- re-apply:
--   delete from public.opportunities where type='scholarship'
--     and source_url in (select source_url from (...source list...));
--
-- Mojibake in the source: the workbook mangled a few non-ASCII characters
-- (Böll, Türkiye, €10,000). The Python builder that emitted this file
-- already restored them; the SQL is the canonical text.


-- Step 1: insert all 40 opportunities, capturing ids into a CTE keyed by title.
with inserted_opps as (
  insert into public.opportunities (
    title, type, organization_name, summary, description, image_url,
    location, opportunity_mode, eligibility, application_url,
    deadline, deadline_note, degree_level, funding_type, country,
    category_id, published_at,
    status, featured, verified, verified_at, verified_by,
    source_name, source_url, created_by, created_at
  ) values
  ('Chevening Scholarship', 'scholarship'::public.opportunity_type, 'Chevening (UK Government)', 'Master''s · Fully funded', 'Degree: Master''s

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: Eligible country

Application route: Official application route; check current call

Deadline: Annual; 2026-27 cycle deadline was 6 Oct 2026', NULL, NULL, 'onsite'::public.opportunity_mode, 'Eligible country', 'https://www.chevening.org/apply/', '2026-10-06T23:59:59+00:00'::timestamptz, 'Annual; 2026-27 cycle deadline was 6 Oct 2026', 'masters'::public.degree_level, 'full'::public.funding_type, 'UK', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official country page', 'https://www.chevening.org/scholarship/bangladesh/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Commonwealth Master''s Scholarships', 'scholarship'::public.opportunity_type, 'Commonwealth Scholarship Commission (UK)', 'Master''s · Fully funded', 'Degree: Master''s

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: Eligible Commonwealth country; annual call

Application route: CSC system + nominating agency / university (programme-specific)

Deadline: Check current CSC call', NULL, NULL, 'onsite'::public.opportunity_mode, 'Eligible Commonwealth country; annual call', 'https://cscuk.fcdo.gov.uk/scholarships-filter-search/', NULL::timestamptz, 'Check current CSC call', 'masters'::public.degree_level, 'full'::public.funding_type, 'UK', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official CSC', 'https://cscuk.fcdo.gov.uk/scholarships/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Commonwealth PhD Scholarships', 'scholarship'::public.opportunity_type, 'Commonwealth Scholarship Commission (UK)', 'PhD · Fully funded', 'Degree: PhD

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: Eligible Commonwealth country; annual call

Application route: CSC system + nominating agency / university (programme-specific)

Deadline: Check current CSC call', NULL, NULL, 'onsite'::public.opportunity_mode, 'Eligible Commonwealth country; annual call', 'https://cscuk.fcdo.gov.uk/scholarships-filter-search/', NULL::timestamptz, 'Check current CSC call', 'phd'::public.degree_level, 'full'::public.funding_type, 'UK', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official CSC', 'https://cscuk.fcdo.gov.uk/scholarships/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Commonwealth Split-site Scholarships', 'scholarship'::public.opportunity_type, 'Commonwealth Scholarship Commission (UK)', 'PhD · Funded', 'Degree: PhD

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: Eligible Commonwealth country; home-country PhD + UK research placement

Application route: CSC system + nominating agency / university (programme-specific)

Deadline: Check current CSC call', NULL, NULL, 'onsite'::public.opportunity_mode, 'Eligible Commonwealth country; home-country PhD + UK research placement', 'https://cscuk.fcdo.gov.uk/scholarships-filter-search/', NULL::timestamptz, 'Check current CSC call', 'phd'::public.degree_level, 'full'::public.funding_type, 'UK', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official CSC', 'https://cscuk.fcdo.gov.uk/scholarships/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Erasmus Mundus Joint Masters', 'scholarship'::public.opportunity_type, 'European Commission — Erasmus+', 'Master''s · Full scholarships available', 'Degree: Master''s

Funding: Full scholarships available

Bangladesh status: Bangladesh

Eligibility: Worldwide applicants welcome; programme-specific eligibility

Application route: Selected Master''s programme''s own application portal

Deadline: Usually Oct-Jan for next academic year', NULL, NULL, 'hybrid'::public.opportunity_mode, 'Worldwide applicants welcome; programme-specific eligibility', 'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters', NULL::timestamptz, 'Usually Oct-Jan for next academic year', 'masters'::public.degree_level, 'full'::public.funding_type, 'Europe', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Erasmus+', 'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Stipendium Hungaricum', 'scholarship'::public.opportunity_type, 'Hungarian Government (Tempus Public Foundation)', 'Master''s / PhD · Tuition-free + stipend + accommodation contribution/medical insurance', 'Degree: Master''s / PhD

Funding: Tuition-free + stipend + accommodation contribution/medical insurance

Bangladesh status: Bangladesh

Eligibility: Bangladesh is an eligible sending partner; full-degree Master''s and Doctoral available

Application route: Official application route; check current call

Deadline: 2026/27 deadline was 15 Jan 2026', NULL, NULL, 'onsite'::public.opportunity_mode, 'Bangladesh is an eligible sending partner; full-degree Master''s and Doctoral available', 'https://apply.stipendiumhungaricum.hu/', NULL::timestamptz, '2026/27 deadline was 15 Jan 2026', 'masters'::public.degree_level, 'partial'::public.funding_type, 'Hungary', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Stipendium Hungaricum', 'https://stipendiumhungaricum.hu/partners/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('MEXT Scholarship', 'scholarship'::public.opportunity_type, 'Ministry of Education, Culture, Sports, Science and Technology — Japan', 'Master''s / PhD / Research · Fully funded', 'Degree: Master''s / PhD / Research

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: Country-specific embassy/university routes

Application route: Embassy of Japan or designated university route

Deadline: Annual; check Bangladesh embassy call', NULL, NULL, 'onsite'::public.opportunity_mode, 'Country-specific embassy/university routes', 'https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/', NULL::timestamptz, 'Annual; check Bangladesh embassy call', 'masters'::public.degree_level, 'full'::public.funding_type, 'Japan', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Study in Japan', 'https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Global Korea Scholarship (GKS) Graduate', 'scholarship'::public.opportunity_type, 'National Institute for International Education — South Korea', 'Master''s / PhD · Fully funded', 'Degree: Master''s / PhD

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: Country quota/university track; annual call

Application route: Embassy Track or University Track

Deadline: Annual; check current GKS notice', NULL, NULL, 'onsite'::public.opportunity_mode, 'Country quota/university track; annual call', 'https://www.studyinkorea.go.kr/', NULL::timestamptz, 'Annual; check current GKS notice', 'masters'::public.degree_level, 'full'::public.funding_type, 'South Korea', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Study in Korea', 'https://www.studyinkorea.go.kr/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Australia Awards Scholarships', 'scholarship'::public.opportunity_type, 'Department of Foreign Affairs and Trade — Australia', 'Master''s / Postgraduate · Fully funded', 'Degree: Master''s / Postgraduate

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: Bangladesh is participating; country-specific priority areas and requirements

Application route: Official application route; check current call

Deadline: 2027 intake closed 30 Apr 2026', NULL, NULL, 'onsite'::public.opportunity_mode, 'Bangladesh is participating; country-specific priority areas and requirements', 'https://oasis.dfat.gov.au/', NULL::timestamptz, '2027 intake closed 30 Apr 2026', 'masters'::public.degree_level, 'full'::public.funding_type, 'Australia', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official DFAT', 'https://www.dfat.gov.au/people-to-people/australia-awards/participating-countries/bangladesh-information-for-intake', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Research Training Program (RTP)', 'scholarship'::public.opportunity_type, 'Australian Government (Department of Education)', 'Research Master''s / PhD · Tuition offset + stipend and/or allowances; university-specific', 'Degree: Research Master''s / PhD

Funding: Tuition offset + stipend and/or allowances; university-specific

Bangladesh status: Bangladesh

Eligibility: International eligibility depends on university

Application route: Participating Australian university

Deadline: University-specific deadlines', NULL, NULL, 'onsite'::public.opportunity_mode, 'International eligibility depends on university', NULL, NULL::timestamptz, 'University-specific deadlines', 'masters'::public.degree_level, 'full'::public.funding_type, 'Australia', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Australian Government', 'https://www.education.gov.au/research-training-program', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Government of Ireland International Education Scholarship', 'scholarship'::public.opportunity_type, 'Higher Education Authority — Ireland', 'Master''s / PhD · €10,000 stipend + full fee waiver for scholarship year', 'Degree: Master''s / PhD

Funding: €10,000 stipend + full fee waiver for scholarship year

Bangladesh status: Bangladesh

Eligibility: Non-EU/EEA/Swiss/UK domiciled applicants; admission offer required

Application route: Official application route; check current call

Deadline: 2026 call closed; annual call', NULL, NULL, 'onsite'::public.opportunity_mode, 'Non-EU/EEA/Swiss/UK domiciled applicants; admission offer required', NULL, NULL::timestamptz, '2026 call closed; annual call', 'masters'::public.degree_level, 'full'::public.funding_type, 'Ireland', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official HEA', 'https://hea.ie/policy/internationalisation/goi-ies/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('DAAD Scholarships', 'scholarship'::public.opportunity_type, 'German Academic Exchange Service (DAAD)', 'Master''s / PhD / Research · Programme-specific; many funded', 'Degree: Master''s / PhD / Research

Funding: Programme-specific; many funded

Bangladesh status: Bangladesh

Eligibility: Programme-specific eligibility

Application route: Programme/country-specific official route

Deadline: Different deadlines by programme', NULL, NULL, 'onsite'::public.opportunity_mode, 'Programme-specific eligibility', NULL, NULL::timestamptz, 'Different deadlines by programme', 'masters'::public.degree_level, 'full'::public.funding_type, 'Germany', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official DAAD', 'https://www.daad.de/en/studying-in-germany/scholarships/daad-scholarships/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Heinrich Böll Foundation Scholarship', 'scholarship'::public.opportunity_type, 'Heinrich Böll Foundation', 'Master''s / PhD · Funded; programme-specific', 'Degree: Master''s / PhD

Funding: Funded; programme-specific

Bangladesh status: Bangladesh

Eligibility: International applicants under call rules

Application route: Official application route; check current call

Deadline: Annual rounds; check current call', NULL, NULL, 'onsite'::public.opportunity_mode, 'International applicants under call rules', NULL, NULL::timestamptz, 'Annual rounds; check current call', 'masters'::public.degree_level, 'full'::public.funding_type, 'Germany', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Foundation', 'https://www.boell.de/en/applying-scholarship', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Swiss Government Excellence Scholarships', 'scholarship'::public.opportunity_type, 'State Secretariat for Education, Research and Innovation — Switzerland', 'Master''s / PhD / Research · Funded; level-dependent', 'Degree: Master''s / PhD / Research

Funding: Funded; level-dependent

Bangladesh status: Bangladesh

Eligibility: Country/degree-specific eligibility

Application route: Programme/country-specific official route

Deadline: Annual; check Bangladesh call', NULL, NULL, 'onsite'::public.opportunity_mode, 'Country/degree-specific eligibility', NULL, NULL::timestamptz, 'Annual; check Bangladesh call', 'masters'::public.degree_level, 'full'::public.funding_type, 'Switzerland', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Swiss Government', 'https://www.sbfi.admin.ch/sbfi/en/home/education/scholarships-and-grants/swiss-government-excellence-scholarships.html', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Türkiye Scholarships', 'scholarship'::public.opportunity_type, 'Türkiye Scholarships ( Presidency for Turks Abroad )', 'Master''s / PhD · Fully funded', 'Degree: Master''s / PhD

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: International applicants; annual call

Application route: Official application route; check current call

Deadline: Annual application window', NULL, NULL, 'onsite'::public.opportunity_mode, 'International applicants; annual call', 'https://tbbs.turkiyeburslari.gov.tr/', NULL::timestamptz, 'Annual application window', 'masters'::public.degree_level, 'full'::public.funding_type, 'Türkiye', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Türkiye Scholarships', 'https://www.turkiyeburslari.gov.tr/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Chinese Government Scholarship (CSC)', 'scholarship'::public.opportunity_type, 'China Scholarship Council', 'Master''s / PhD · Fully funded / funded', 'Degree: Master''s / PhD

Funding: Fully funded / funded

Bangladesh status: Bangladesh

Eligibility: Route and university-specific requirements

Application route: Official application route; check current call

Deadline: Annual; embassy/university deadlines vary', NULL, NULL, 'onsite'::public.opportunity_mode, 'Route and university-specific requirements', 'https://studyinchina.csc.edu.cn/', NULL::timestamptz, 'Annual; embassy/university deadlines vary', 'masters'::public.degree_level, 'full'::public.funding_type, 'China', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official CSC', 'https://www.campuschina.org/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('TaiwanICDF Scholarship', 'scholarship'::public.opportunity_type, 'Taiwan International Cooperation and Development Fund', 'Master''s / PhD · Fully funded', 'Degree: Master''s / PhD

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: Participating-country/programme rules

Application route: Official application route; check current call

Deadline: Annual; country-specific', NULL, NULL, 'onsite'::public.opportunity_mode, 'Participating-country/programme rules', NULL, NULL::timestamptz, 'Annual; country-specific', 'masters'::public.degree_level, 'full'::public.funding_type, 'Taiwan', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official TaiwanICDF', 'https://www.icdf.org.tw/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Singapore International Graduate Award (SINGA)', 'scholarship'::public.opportunity_type, 'A*STAR — Singapore', 'PhD · Fully funded', 'Degree: PhD

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: International students; eligible science/engineering research areas

Application route: Official application route; check current call

Deadline: Multiple annual intakes', NULL, NULL, 'onsite'::public.opportunity_mode, 'International students; eligible science/engineering research areas', 'https://sms-applicant-app.a-star.edu.sg/', NULL::timestamptz, 'Multiple annual intakes', 'phd'::public.degree_level, 'full'::public.funding_type, 'Singapore', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official A*STAR', 'https://www.a-star.edu.sg/singa-scholarship', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Vanier Canada Graduate Scholarships', 'scholarship'::public.opportunity_type, 'Government of Canada (Vanier CGS)', 'PhD · Funded', 'Degree: PhD

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: International applicants can be nominated under programme rules

Application route: Official application route; check current call

Deadline: Annual; institution nomination process', NULL, NULL, 'onsite'::public.opportunity_mode, 'International applicants can be nominated under programme rules', NULL, NULL::timestamptz, 'Annual; institution nomination process', 'phd'::public.degree_level, 'full'::public.funding_type, 'Canada', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Government of Canada', 'https://vanier.gc.ca/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Fulbright Foreign Student Program', 'scholarship'::public.opportunity_type, 'U.S. Department of State (Fulbright)', 'Master''s / PhD / Research · Funded; country-specific', 'Degree: Master''s / PhD / Research

Funding: Funded; country-specific

Bangladesh status: Bangladesh

Eligibility: Application route and fields vary by country

Application route: Official application route; check current call

Deadline: Country-specific deadlines', NULL, NULL, 'onsite'::public.opportunity_mode, 'Application route and fields vary by country', 'https://foreign.fulbrightonline.org/apply', NULL::timestamptz, 'Country-specific deadlines', 'masters'::public.degree_level, 'full'::public.funding_type, 'USA', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Fulbright', 'https://foreign.fulbrightonline.org/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Joint Japan/World Bank Graduate Scholarship Program', 'scholarship'::public.opportunity_type, 'World Bank Group', 'Master''s · Funded', 'Degree: Master''s

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: Developing-country professionals; programme/partner university rules

Application route: Official application route; check current call

Deadline: Annual call', NULL, NULL, 'onsite'::public.opportunity_mode, 'Developing-country professionals; programme/partner university rules', NULL, NULL::timestamptz, 'Annual call', 'masters'::public.degree_level, 'full'::public.funding_type, 'Multiple', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official World Bank', 'https://www.worldbank.org/en/programs/scholarships', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('ADB-Japan Scholarship Program', 'scholarship'::public.opportunity_type, 'Asian Development Bank', 'Master''s · Funded', 'Degree: Master''s

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: Eligible ADB developing member country; participating institutions

Application route: Official application route; check current call

Deadline: University-specific / annual', NULL, NULL, 'onsite'::public.opportunity_mode, 'Eligible ADB developing member country; participating institutions', NULL, NULL::timestamptz, 'University-specific / annual', 'masters'::public.degree_level, 'full'::public.funding_type, 'Asia-Pacific', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official ADB', 'https://www.adb.org/work-with-us/careers/japan-scholarship-program', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Aga Khan Foundation International Scholarship Programme', 'scholarship'::public.opportunity_type, 'Aga Khan Development Network', 'Master''s / PhD · Financial assistance; country/route-specific', 'Degree: Master''s / PhD

Funding: Financial assistance; country/route-specific

Bangladesh status: Bangladesh

Eligibility: Bangladesh is among programme geographies; check annual call

Application route: Official application route; check current call

Deadline: Annual', NULL, NULL, 'onsite'::public.opportunity_mode, 'Bangladesh is among programme geographies; check annual call', NULL, NULL::timestamptz, 'Annual', 'masters'::public.degree_level, 'partial'::public.funding_type, 'Multiple', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official AKDN', 'https://www.akdn.org/our-agencies/aga-khan-foundation/international-scholarship-programme', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Rotary Peace Fellowship', 'scholarship'::public.opportunity_type, 'Rotary International', 'Master''s / Professional · Fully funded', 'Degree: Master''s / Professional

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: International applicants; peace/development focus

Application route: Official application route; check current call

Deadline: Annual', NULL, NULL, 'onsite'::public.opportunity_mode, 'International applicants; peace/development focus', NULL, NULL::timestamptz, 'Annual', 'masters'::public.degree_level, 'full'::public.funding_type, 'Multiple', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Rotary', 'https://www.rotary.org/en/our-programs/peace-fellowships', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('ARES Scholarships', 'scholarship'::public.opportunity_type, 'Académie de Recherche et d''Enseignement Supérieur — Belgium', 'Master''s / Specialisation · Funded', 'Degree: Master''s / Specialisation

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: Country eligibility and programme list must be checked each call

Application route: Programme/country-specific official route

Deadline: Annual', NULL, NULL, 'onsite'::public.opportunity_mode, 'Country eligibility and programme list must be checked each call', NULL, NULL::timestamptz, 'Annual', 'masters'::public.degree_level, 'full'::public.funding_type, 'Belgium', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official ARES', 'https://www.ares-ac.be/en/cooperation-au-developpement/scholarships', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('VLIR-UOS Scholarships', 'scholarship'::public.opportunity_type, 'VLIR-UOS — Belgium', 'Master''s / Training · Funded', 'Degree: Master''s / Training

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: Eligible-country and programme rules; verify current call

Application route: Programme/country-specific official route

Deadline: Annual', NULL, NULL, 'onsite'::public.opportunity_mode, 'Eligible-country and programme rules; verify current call', NULL, NULL::timestamptz, 'Annual', 'masters'::public.degree_level, 'full'::public.funding_type, 'Belgium', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official VLIR-UOS', 'https://www.vliruos.be/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Italian Government Scholarships', 'scholarship'::public.opportunity_type, 'Italian Government (MAECI / Study in Italy)', 'Master''s / PhD / Research · Funded; call-specific', 'Degree: Master''s / PhD / Research

Funding: Funded; call-specific

Bangladesh status: Bangladesh

Eligibility: Country/programme eligibility varies

Application route: Official application route; check current call

Deadline: Annual', NULL, NULL, 'onsite'::public.opportunity_mode, 'Country/programme eligibility varies', NULL, NULL::timestamptz, 'Annual', 'masters'::public.degree_level, 'full'::public.funding_type, 'Italy', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Study in Italy', 'https://studyinitaly.esteri.it/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Romanian Government Scholarship', 'scholarship'::public.opportunity_type, 'Government of Romania', 'Master''s / PhD · Funded; call-specific', 'Degree: Master''s / PhD

Funding: Funded; call-specific

Bangladesh status: Bangladesh

Eligibility: Non-EU applicants; current call rules

Application route: Official application route; check current call

Deadline: Annual', NULL, NULL, 'onsite'::public.opportunity_mode, 'Non-EU applicants; current call rules', NULL, NULL::timestamptz, 'Annual', 'masters'::public.degree_level, 'full'::public.funding_type, 'Romania', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Study in Romania', 'https://studyinromania.gov.ro/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Poland NAWA Scholarships', 'scholarship'::public.opportunity_type, 'Polish National Agency for Academic Exchange (NAWA)', 'Master''s / PhD / Research · Varies', 'Degree: Master''s / PhD / Research

Funding: Varies

Bangladesh status: Bangladesh

Eligibility: Programme-specific eligibility

Application route: Official application route; check current call

Deadline: Multiple calls; check NAWA', NULL, NULL, 'onsite'::public.opportunity_mode, 'Programme-specific eligibility', NULL, NULL::timestamptz, 'Multiple calls; check NAWA', 'masters'::public.degree_level, NULL::public.funding_type, 'Poland', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official NAWA', 'https://nawa.gov.pl/en/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Czech Government Scholarships', 'scholarship'::public.opportunity_type, 'Ministry of Education, Youth and Sports — Czechia', 'Master''s / PhD · Funded', 'Degree: Master''s / PhD

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: Country/programme-specific

Application route: Official application route; check current call

Deadline: Annual; check current call', NULL, NULL, 'onsite'::public.opportunity_mode, 'Country/programme-specific', NULL, NULL::timestamptz, 'Annual; check current call', 'masters'::public.degree_level, 'full'::public.funding_type, 'Czechia', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Czech Ministry', 'https://msmt.gov.cz/areas-of-work/tertiary-education/government-scholarships-for-developing-countries', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Maastricht University NL-High Potential Scholarship', 'scholarship'::public.opportunity_type, 'Maastricht University', 'Master''s · Fully funded / major funding', 'Degree: Master''s

Funding: Fully funded / major funding

Bangladesh status: Bangladesh

Eligibility: Non-EU/EEA applicants; programme-specific

Application route: Official application route; check current call

Deadline: Annual; 2026/27 application window 1 Oct 2026–1 Feb 2027', NULL, NULL, 'onsite'::public.opportunity_mode, 'Non-EU/EEA applicants; programme-specific', NULL, '2027-02-01T23:59:59+00:00'::timestamptz, 'Annual; 2026/27 application window 1 Oct 2026–1 Feb 2027', 'masters'::public.degree_level, 'full'::public.funding_type, 'Netherlands', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Maastricht University', 'https://www.maastrichtuniversity.nl/education/financing-your-studies/scholarships', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('ETH Zurich Excellence Scholarship & Opportunity Programme', 'scholarship'::public.opportunity_type, 'ETH Zurich', 'Master''s · Funded', 'Degree: Master''s

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: International Master''s applicants; programme-specific

Application route: Official application route; check current call

Deadline: Annual; programme-specific', NULL, NULL, 'onsite'::public.opportunity_mode, 'International Master''s applicants; programme-specific', NULL, NULL::timestamptz, 'Annual; programme-specific', 'masters'::public.degree_level, 'full'::public.funding_type, 'Switzerland', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official ETH Zurich', 'https://ethz.ch/en/studies/financial/scholarships/excellencescholarship.html', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('EPFL Excellence Fellowships', 'scholarship'::public.opportunity_type, 'École Polytechnique Fédérale de Lausanne', 'Master''s · Funded/partial', 'Degree: Master''s

Funding: Funded/partial

Bangladesh status: Bangladesh

Eligibility: International Master''s applicants; programme-specific

Application route: Official application route; check current call

Deadline: Annual; programme-specific', NULL, NULL, 'onsite'::public.opportunity_mode, 'International Master''s applicants; programme-specific', NULL, NULL::timestamptz, 'Annual; programme-specific', 'masters'::public.degree_level, 'partial'::public.funding_type, 'Switzerland', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official EPFL', 'https://www.epfl.ch/education/studies/en/financing-study/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Clarendon Scholarship', 'scholarship'::public.opportunity_type, 'University of Oxford (Clarendon Fund)', 'Master''s / DPhil · Fully funded', 'Degree: Master''s / DPhil

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: International graduate applicants to Oxford

Application route: Official application route; check current call

Deadline: Usually aligned with Oxford course application deadline', NULL, NULL, 'onsite'::public.opportunity_mode, 'International graduate applicants to Oxford', NULL, NULL::timestamptz, 'Usually aligned with Oxford course application deadline', 'masters'::public.degree_level, 'full'::public.funding_type, 'UK', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Oxford', 'https://www.ox.ac.uk/clarendon', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Gates Cambridge Scholarship', 'scholarship'::public.opportunity_type, 'Gates Cambridge Trust', 'Master''s / PhD · Fully funded', 'Degree: Master''s / PhD

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: International applicants; course-specific

Application route: Official application route; check current call

Deadline: Annual; Cambridge course deadlines apply', NULL, NULL, 'onsite'::public.opportunity_mode, 'International applicants; course-specific', 'https://www.gatescambridge.org/apply/', NULL::timestamptz, 'Annual; Cambridge course deadlines apply', 'masters'::public.degree_level, 'full'::public.funding_type, 'UK', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Gates Cambridge', 'https://www.gatescambridge.org/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('UCL Research Excellence Scholarship', 'scholarship'::public.opportunity_type, 'University College London', 'PhD · Fully funded', 'Degree: PhD

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: International research applicants; eligibility/call specific

Application route: Official application route; check current call

Deadline: Annual; check current UCL call', NULL, NULL, 'onsite'::public.opportunity_mode, 'International research applicants; eligibility/call specific', NULL, NULL::timestamptz, 'Annual; check current UCL call', 'phd'::public.degree_level, 'full'::public.funding_type, 'UK', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official UCL', 'https://www.ucl.ac.uk/scholarships/research-excellence-scholarship', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Knight-Hennessy Scholars', 'scholarship'::public.opportunity_type, 'Stanford University (Knight-Hennessy)', 'Graduate · Funded', 'Degree: Graduate

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: Applicants to eligible Stanford graduate programmes

Application route: Official application route; check current call

Deadline: Annual; Stanford programme deadlines also apply', NULL, NULL, 'onsite'::public.opportunity_mode, 'Applicants to eligible Stanford graduate programmes', NULL, NULL::timestamptz, 'Annual; Stanford programme deadlines also apply', NULL::public.degree_level, 'full'::public.funding_type, 'USA', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Stanford', 'https://knight-hennessy.stanford.edu/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('McCall MacBain Scholarships', 'scholarship'::public.opportunity_type, 'McCall MacBain — McGill University', 'Master''s · Fully funded / major funding', 'Degree: Master''s

Funding: Fully funded / major funding

Bangladesh status: Bangladesh

Eligibility: Eligibility depends on degree/institution and citizenship rules

Application route: Official application route; check current call

Deadline: Annual', NULL, NULL, 'onsite'::public.opportunity_mode, 'Eligibility depends on degree/institution and citizenship rules', 'https://mccallmacbainscholars.org/apply/', NULL::timestamptz, 'Annual', 'masters'::public.degree_level, 'full'::public.funding_type, 'Canada', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official McCall MacBain', 'https://mccallmacbainscholars.org/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Government of Ireland Postgraduate Scholarship', 'scholarship'::public.opportunity_type, 'Irish Research Council', 'Master''s / PhD · Funded', 'Degree: Master''s / PhD

Funding: Funded

Bangladesh status: Bangladesh

Eligibility: International applicants under IRC rules

Application route: Official application route; check current call

Deadline: Annual', NULL, NULL, 'onsite'::public.opportunity_mode, 'International applicants under IRC rules', 'https://research.ie/funding/goipg/', NULL::timestamptz, 'Annual', 'masters'::public.degree_level, 'full'::public.funding_type, 'Ireland', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official Irish Research Council', 'https://research.ie/funding/goipg/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz),
  ('Manaaki New Zealand Scholarships', 'scholarship'::public.opportunity_type, 'New Zealand Ministry of Foreign Affairs and Trade', 'Postgraduate / Undergraduate · Fully funded', 'Degree: Postgraduate / Undergraduate

Funding: Fully funded

Bangladesh status: Bangladesh

Eligibility: Participating-country and field rules

Application route: Official application route; check current call

Deadline: Annual; check current country profile', NULL, NULL, 'onsite'::public.opportunity_mode, 'Participating-country and field rules', NULL, NULL::timestamptz, 'Annual; check current country profile', 'undergraduate'::public.degree_level, 'full'::public.funding_type, 'New Zealand', NULL, '2026-09-26T16:18:13+00:00'::timestamptz, 'published'::public.opportunity_status, false, true, NULL, NULL, 'Official New Zealand Government', 'https://www.nzscholarships.govt.nz/', NULL, '2026-09-26T16:18:13+00:00'::timestamptz)
  returning id, title
)

-- Step 2: insert the matching eligibility rows.
--         The text-array fields carry the same information the spreadsheet
--         listed under "Bangladesh Status" / "Funding"; we leave test
--         minimums + activity flags NULL because the spreadsheet does not
--         record them per scholarship (admins fill these in later via the
--         existing opportunity form).
insert into public.opportunity_eligibility (
  opportunity_id, degree_levels, fields, countries, nationalities,
  required_documents, other_requirements
)
select
  i.id,
  k.degree_levels,
  '{}'::text[],
  k.countries,
  k.nationalities,
  '{}'::text[],
  k.other_requirements
from inserted_opps i
join (values
  ('Chevening Scholarship', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Commonwealth Master''s Scholarships', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Commonwealth PhD Scholarships', '{phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Commonwealth Split-site Scholarships', '{phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('Erasmus Mundus Joint Masters', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Full scholarships available'),
  ('Stipendium Hungaricum', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Tuition-free + stipend + accommodation contribution/medical insurance'),
  ('MEXT Scholarship', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Global Korea Scholarship (GKS) Graduate', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Australia Awards Scholarships', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Research Training Program (RTP)', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Tuition offset + stipend and/or allowances; university-specific'),
  ('Government of Ireland International Education Scholarship', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], '€10,000 stipend + full fee waiver for scholarship year'),
  ('DAAD Scholarships', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Programme-specific; many funded'),
  ('Heinrich Böll Foundation Scholarship', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded; programme-specific'),
  ('Swiss Government Excellence Scholarships', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded; level-dependent'),
  ('Türkiye Scholarships', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Chinese Government Scholarship (CSC)', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded / funded'),
  ('TaiwanICDF Scholarship', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Singapore International Graduate Award (SINGA)', '{phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Vanier Canada Graduate Scholarships', '{phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('Fulbright Foreign Student Program', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded; country-specific'),
  ('Joint Japan/World Bank Graduate Scholarship Program', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('ADB-Japan Scholarship Program', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('Aga Khan Foundation International Scholarship Programme', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Financial assistance; country/route-specific'),
  ('Rotary Peace Fellowship', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('ARES Scholarships', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('VLIR-UOS Scholarships', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('Italian Government Scholarships', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded; call-specific'),
  ('Romanian Government Scholarship', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded; call-specific'),
  ('Poland NAWA Scholarships', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Varies'),
  ('Czech Government Scholarships', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('Maastricht University NL-High Potential Scholarship', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded / major funding'),
  ('ETH Zurich Excellence Scholarship & Opportunity Programme', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('EPFL Excellence Fellowships', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded/partial'),
  ('Clarendon Scholarship', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Gates Cambridge Scholarship', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('UCL Research Excellence Scholarship', '{phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded'),
  ('Knight-Hennessy Scholars', '{}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('McCall MacBain Scholarships', '{masters}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded / major funding'),
  ('Government of Ireland Postgraduate Scholarship', '{masters,phd}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Funded'),
  ('Manaaki New Zealand Scholarships', '{undergraduate}'::public.degree_level[], '{Bangladesh}'::text[], '{Bangladeshi}'::text[], 'Fully funded')
) as k(title, degree_levels, countries, nationalities, other_requirements)
  on k.title = i.title;
