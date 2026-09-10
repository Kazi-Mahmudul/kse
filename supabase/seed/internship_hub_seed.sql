-- Internship Hub backfill (spec 06._internship_hub_kse).
--
-- Idempotent: uses fixed UUIDs with `on conflict (id) do nothing`, so re-running
-- `supabase db reset` (or just this file on top of an existing DB) is a no-op.
--
-- Covers all four chips that the new Internship Hub screen ships:
--   * All         — 3+ published internships
--   * On-site     — onsite mode
--   * Remote      — remote mode
--   * Part-time   — internship_type = 'part_time'
--
-- Plus a couple of full_time / unpaid rows so the filter sheet has variety.

insert into public.opportunities (
  id, type, title, organization_name, summary, description, location,
  opportunity_mode, eligibility, application_url, deadline, category_id,
  published_at, status, featured, verified, source_name, source_url,
  stipend_amount, stipend_currency, internship_type
) values
  -- BS23 (spec card #1)
  ('22222222-2222-2222-2222-222222222301', 'internship',
   'Software Development Intern', 'Brain Station 23',
   'Work on enterprise web apps with a senior mentor. Open to CSE students.',
   'You will pair with senior engineers at Brain Station 23 on client-facing React/Node applications, contributing to features end-to-end over a 3-month paid internship.',
   'Khulna, Bangladesh', 'onsite',
   'Undergraduate CSE students.',
   'https://example.com/apply/bs23-swe', now() + interval '40 days',
   (select id from public.opportunity_categories where name = 'Company Internship'),
   now() - interval '1 day', 'published', true, true, 'KSE Team', null,
   8000.00, 'BDT', 'full_time'),

  -- SoftLab IT (spec card #2 — Remote)
  ('22222222-2222-2222-2222-222222222302', 'internship',
   'Mobile App Developer Intern', 'SoftLab IT',
   'Remote React Native internship with flexible hours.',
   'Build new screens and ship weekly releases for a React Native client app. Mentor-led pairing sessions, async-friendly culture.',
   'Remote (Bangladesh)', 'remote',
   'Students with React Native basics.',
   'https://example.com/apply/softlab-rn', now() + interval '25 days',
   (select id from public.opportunity_categories where name = 'Company Internship'),
   now() - interval '3 days', 'published', false, true, 'KSE Team', null,
   12000.00, 'BDT', 'part_time'),

  -- Design Valley (spec card #3)
  ('22222222-2222-2222-2222-222222222303', 'internship',
   'UI/UX Design Intern', 'Design Valley',
   'Design mobile-first product flows alongside product designers.',
   'Hands-on product design internship: wireframes, prototypes, usability tests, and design-system contributions for a real consumer app.',
   'Dhaka, Bangladesh', 'onsite',
   'Design students or self-taught with a portfolio.',
   'https://example.com/apply/dv-ux', now() + interval '18 days',
   (select id from public.opportunity_categories where name = 'Company Internship'),
   now() - interval '2 days', 'published', false, true, 'KSE Team', null,
   null, null, 'unpaid'),

  -- Extra: unpaid / contract variety for filter sheet
  ('22222222-2222-2222-2222-222222222304', 'internship',
   'Data Engineering Intern', 'DataPath Labs',
   '6-month contract role building ETL pipelines for analytics.',
   'A contract data engineering internship working alongside senior data engineers on production ETL and analytics dashboards.',
   'Remote (Bangladesh)', 'remote',
   'Senior undergraduate or recent grads with SQL + Python.',
   'https://example.com/apply/datapath', now() + interval '60 days',
   (select id from public.opportunity_categories where name = 'Company Internship'),
   now() - interval '6 days', 'published', false, true, 'KSE Team', null,
   15000.00, 'BDT', 'contract'),

  ('22222222-2222-2222-2222-222222222305', 'internship',
   'Backend Engineering Intern (Node)', 'NorthCloud',
   'Part-time Node.js internship, ~15 hours per week.',
   'Work on Node.js APIs and database design. Async-friendly, with weekly mentor sessions and a small group of backend interns.',
   'Remote (Bangladesh)', 'remote',
   'Students comfortable with JavaScript and SQL basics.',
   'https://example.com/apply/northcloud-be', now() + interval '35 days',
   (select id from public.opportunity_categories where name = 'Company Internship'),
   now() - interval '4 days', 'published', false, true, 'KSE Team', null,
   6000.00, 'BDT', 'part_time')
on conflict (id) do nothing;
