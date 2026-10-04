-- ── Mentor network seed ──────────────────────────────────────────────────────
-- Populates the Mentorship section (/explore/mentorship in the app) with a
-- founding cohort of eight mentors. Mentors are ordinary `opportunities`
-- rows with type='mentorship': title = mentor's name, organization_name =
-- their role/company, image_url = portrait, summary = one-line pitch,
-- description = full profile. Expertise lives in tags.
--
-- Idempotent by design: every row has a fixed UUID and `on conflict (id)
-- do nothing`, so re-running (or applying on an environment that already
-- received the same rows via REST) is always a no-op. Portraits are
-- Unsplash photos verified live (HTTP 200) at seed time.

insert into public.opportunities (
  id, title, type, organization_name, summary, description, image_url,
  location, opportunity_mode, eligibility, application_url,
  deadline, deadline_note,
  status, featured, verified, verified_at, verified_by,
  source_name, source_url, created_by, created_at, published_at
) values
  (
    'aaaaaaa1-0000-4000-8000-000000000001',
    'Rezaul Karim',
    'mentorship'::public.opportunity_type,
    'Senior Software Engineer · Brain Station 23',
    'Backend & system design mentoring for junior engineers',
    E'Things Rezaul can help with:\n\n• Breaking into your first backend job (Node.js, PostgreSQL, REST)\n• System design fundamentals for interviews\n• Code review habits and writing maintainable code\n• Building a portfolio that gets shortlisted\n\nAbout: 8 years building fintech backends in Dhaka. Started as a KUET student doing freelance gigs, now leads a 12-engineer team. Takes 2 mentees per quarter, prefers 30-minute sessions every two weeks.\n\nBest for: CSE students and fresh graduates targeting software engineering roles.',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=80',
    'Khulna', 'remote'::public.opportunity_mode,
    'Serious CSE students or fresh graduates; bring one project you want feedback on.',
    null,
    '2026-12-15T18:00:00+00:00'::timestamptz,
    'Rolling — next cohort starts monthly',
    'published'::public.opportunity_status, true, true,
    now(), '22222222-2222-2222-2222-222222222201',
    'KSE Mentor Network', null,
    '22222222-2222-2222-2222-222222222201', now(), now()
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000002',
    'Nusrat Jahan',
    'mentorship'::public.opportunity_type,
    'Product Designer · Pathao',
    'UX/UI portfolio reviews and design-career guidance',
    E'Things Nusrat can help with:\n\n• Turning class projects into a hireable UX portfolio\n• Figma workflows, design systems and handoff discipline\n• Preparing for design internships and junior roles\n• Interview critique — how designers are actually evaluated\n\nAbout: Product designer with 6 years across logistics and fintech products. Mentored 20+ students through the Pathao design internship programme. Reviews portfolios async over chat, plus one 45-minute call a month.\n\nBest for: design-curious students from any discipline — no art background needed.',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
    'Remote', 'remote'::public.opportunity_mode,
    'Anyone willing to share their portfolio (even rough work) before the first session.',
    null,
    '2026-12-15T18:00:00+00:00'::timestamptz,
    'Rolling — reviews within a week',
    'published'::public.opportunity_status, true, true,
    now(), '22222222-2222-2222-2222-222222222201',
    'KSE Mentor Network', null,
    '22222222-2222-2222-2222-222222222201', now(), now()
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000003',
    'Tanvir Ahmed',
    'mentorship'::public.opportunity_type,
    'Lecturer, CSE · Khulna University of Engineering & Technology',
    'Research, higher studies and scholarship applications',
    E'Things Tanvir can help with:\n\n• Choosing between a job and graduate school\n• Building a research profile (papers, projects, supervisors)\n• Fulbright / Commonwealth / MEXT application strategy\n• Statement-of-purpose reviews — structure that actually works\n\nAbout: KUET lecturer and Commonwealth Scholarship alumnus. Has coached 30+ students through international applications; nine received full funding. Monthly one-hour sessions with homework in between.\n\nBest for: final-year students and recent graduates planning MS/PhD abroad.',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80',
    'Khulna', 'hybrid'::public.opportunity_mode,
    'Final-year or graduate students with a target intake in mind.',
    null,
    '2026-12-15T18:00:00+00:00'::timestamptz,
    'Cohort opens each semester',
    'published'::public.opportunity_status, false, true,
    now(), '22222222-2222-2222-2222-222222222201',
    'KSE Mentor Network', null,
    '22222222-2222-2222-2222-222222222201', now(), now()
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000004',
    'Farhana Rahman',
    'mentorship'::public.opportunity_type,
    'Data Scientist · bKash',
    'Data science, SQL and analytics career paths',
    E'Things Farhana can help with:\n\n• Learning path: Excel → SQL → Python → first analytics job\n• Building data projects with real Bangladeshi datasets\n• Internship interviews at fintech and telcos\n• Communicating insights to non-technical people\n\nAbout: Statistics graduate from Khulna University who moved into industry through self-study — she remembers exactly how confusing the internet''s advice was. Bi-weekly 30-minute calls plus a shared learning checklist.\n\nBest for: students from any background curious about data careers.',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=80',
    'Khulna', 'remote'::public.opportunity_mode,
    'Curiosity required, coding experience optional.',
    null,
    '2026-12-15T18:00:00+00:00'::timestamptz,
    'Rolling',
    'published'::public.opportunity_status, false, true,
    now(), '22222222-2222-2222-2222-222222222201',
    'KSE Mentor Network', null,
    '22222222-2222-2222-2222-222222222201', now(), now()
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000005',
    'Mahmudul Hasan',
    'mentorship'::public.opportunity_type,
    'Founder & CEO · SoftLab IT, Khulna',
    'Freelancing, first clients and running a small tech business',
    E'Things Mahmudul can help with:\n\n• Starting on Upwork/Fiverr with a profile that converts\n• Pricing, proposals and collecting payment in Bangladesh\n• Growing freelance work into an agency\n• Time management while studying\n\nAbout: Started freelancing from a Khulna mess room in 2018; SoftLab IT now employs 14 people and serves local businesses. Speaks plainly about failures (two client disasters included). One 45-minute session a month, open chat in between.\n\nBest for: students who want to earn from skills before graduation.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    'Khulna', 'onsite'::public.opportunity_mode,
    'Bring one skill you can already do — we build the business around it.',
    null,
    '2026-12-15T18:00:00+00:00'::timestamptz,
    'Rolling — office hours at SoftLab, Moylapota',
    'published'::public.opportunity_status, true, true,
    now(), '22222222-2222-2222-2222-222222222201',
    'KSE Mentor Network', null,
    '22222222-2222-2222-2222-222222222201', now(), now()
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000006',
    'Shahida Akter',
    'mentorship'::public.opportunity_type,
    'HR Manager · City Group',
    'CV writing, interviews and corporate job preparation',
    E'Things Shahida can help with:\n\n• A CV that survives the 6-second scan\n• Mock interviews (in Bangla or English)\n• Salary negotiation for first jobs\n• Understanding what corporates actually screen for\n\nAbout: 10 years in recruitment across FMCG and manufacturing; has reviewed over 15,000 CVs. Runs a free monthly CV clinic for Khulna students. One session plus a written CV review.\n\nBest for: final-year students from business, science and engineering.',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80',
    'Khulna', 'hybrid'::public.opportunity_mode,
    'Send your current CV (any state) when you apply.',
    null,
    '2026-12-15T18:00:00+00:00'::timestamptz,
    'CV clinic every first Friday',
    'published'::public.opportunity_status, false, true,
    now(), '22222222-2222-2222-2222-222222222201',
    'KSE Mentor Network', null,
    '22222222-2222-2222-2222-222222222201', now(), now()
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000007',
    'Arif Chowdhury',
    'mentorship'::public.opportunity_type,
    'Mobile Engineer · ShopUp',
    'React Native and mobile development from zero to offer',
    E'Things Arif can help with:\n\n• A 90-day React Native learning roadmap\n• Publishing your first app to the Play Store\n• Mobile interview prep (offline-first, state, performance)\n• Open-source contribution starter issues\n\nAbout: Self-taught developer from Jashore, now shipping features used by millions. Believes the fastest path is building one real app end-to-end. Weekly 20-minute check-ins while you build.\n\nBest for: students who learn by building and want accountability.',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=80',
    'Jashore', 'remote'::public.opportunity_mode,
    'Basic programming in any language; own laptop.',
    null,
    '2026-12-15T18:00:00+00:00'::timestamptz,
    'Rolling — pairs start every two weeks',
    'published'::public.opportunity_status, false, true,
    now(), '22222222-2222-2222-2222-222222222201',
    'KSE Mentor Network', null,
    '22222222-2222-2222-2222-222222222201', now(), now()
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000008',
    'Sadia Afrin',
    'mentorship'::public.opportunity_type,
    'IELTS 8.5 · English Teacher, Khulna',
    'IELTS preparation and English communication confidence',
    E'Things Sadia can help with:\n\n• IELTS band 7+ strategy for each module\n• Speaking practice with honest, scored feedback\n• Writing corrections — the 3 mistakes most candidates repeat\n• Study plans that fit around university\n\nAbout: Scored 8.5 overall (2019) and has taught 400+ students in Khulna over six years. Offers a free diagnostic session first, then fortnightly practice cycles. Groups of 3 welcome for speaking practice.\n\nBest for: scholarship and higher-studies applicants on a deadline.',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
    'Khulna', 'hybrid'::public.opportunity_mode,
    'Book the free diagnostic first — no preparation needed.',
    null,
    '2026-12-15T18:00:00+00:00'::timestamptz,
    'New diagnostic slots weekly',
    'published'::public.opportunity_status, false, true,
    now(), '22222222-2222-2222-2222-222222222201',
    'KSE Mentor Network', null,
    '22222222-2222-2222-2222-222222222201', now(), now()
  )
on conflict (id) do nothing;

-- Expertise tags for each mentor. Tags are keyed by name (the table has a
-- unique name constraint and some values already exist from other seeds),
-- so re-runs are always no-ops.
insert into public.tags (name) values
  ('backend'),
  ('system-design'),
  ('ux-design'),
  ('portfolio-review'),
  ('research'),
  ('higher-studies'),
  ('data-science'),
  ('analytics'),
  ('freelancing'),
  ('career'),
  ('cv-review'),
  ('interview-prep'),
  ('react-native'),
  ('mobile'),
  ('ielts'),
  ('english')
on conflict (name) do nothing;

insert into public.opportunity_tags (opportunity_id, tag_id)
select o.id, t.id
from (values
  ('aaaaaaa1-0000-4000-8000-000000000001', 'backend'),
  ('aaaaaaa1-0000-4000-8000-000000000001', 'system-design'),
  ('aaaaaaa1-0000-4000-8000-000000000001', 'career'),
  ('aaaaaaa1-0000-4000-8000-000000000002', 'ux-design'),
  ('aaaaaaa1-0000-4000-8000-000000000002', 'portfolio-review'),
  ('aaaaaaa1-0000-4000-8000-000000000003', 'research'),
  ('aaaaaaa1-0000-4000-8000-000000000003', 'higher-studies'),
  ('aaaaaaa1-0000-4000-8000-000000000004', 'data-science'),
  ('aaaaaaa1-0000-4000-8000-000000000004', 'analytics'),
  ('aaaaaaa1-0000-4000-8000-000000000005', 'freelancing'),
  ('aaaaaaa1-0000-4000-8000-000000000005', 'career'),
  ('aaaaaaa1-0000-4000-8000-000000000006', 'cv-review'),
  ('aaaaaaa1-0000-4000-8000-000000000006', 'interview-prep'),
  ('aaaaaaa1-0000-4000-8000-000000000007', 'react-native'),
  ('aaaaaaa1-0000-4000-8000-000000000007', 'mobile'),
  ('aaaaaaa1-0000-4000-8000-000000000008', 'ielts'),
  ('aaaaaaa1-0000-4000-8000-000000000008', 'english')
) as v(opp_id, tag_name)
join public.opportunities o on o.id = v.opp_id::uuid
join public.tags t on t.name = v.tag_name
on conflict (opportunity_id, tag_id) do nothing;
