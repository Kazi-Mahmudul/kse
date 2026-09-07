-- KSE seed data — applied by `supabase db reset`.
-- Starter master data; admins extend it through the admin portal.

-- ── Universities (Khulna region) ────────────────────────────────────────────

insert into public.universities (id, name, short_name, location) values
  ('11111111-1111-1111-1111-111111111101', 'Khulna University', 'KhU', 'Khulna'),
  ('11111111-1111-1111-1111-111111111102', 'Khulna University of Engineering & Technology', 'KUET', 'Khulna'),
  ('11111111-1111-1111-1111-111111111103', 'North Western University', 'NWU', 'Khulna'),
  ('11111111-1111-1111-1111-111111111104', 'Northern University Bangladesh, Khulna Campus', 'NUB', 'Khulna')
on conflict (name) do nothing;

-- ── Departments (common set per university) ─────────────────────────────────

insert into public.departments (university_id, name, code)
select u.id, d.name, d.code
from public.universities u
cross join (values
  ('Computer Science and Engineering', 'CSE'),
  ('Electrical and Electronic Engineering', 'EEE'),
  ('Civil Engineering', 'CE'),
  ('Mechanical Engineering', 'ME'),
  ('Business Administration', 'BBA'),
  ('Economics', 'ECO'),
  ('English', 'ENG'),
  ('Mathematics', 'MATH'),
  ('Pharmacy', 'PHARM'),
  ('Law', 'LAW')
) as d(name, code)
on conflict (university_id, name) do nothing;

-- ── Subjects / Skills / Tags ────────────────────────────────────────────────

insert into public.subjects (name) values
  ('Mathematics'), ('Physics'), ('Chemistry'), ('Biology'),
  ('Programming in C'), ('Data Structures and Algorithms'),
  ('Object-Oriented Programming'), ('Database Systems'),
  ('Digital Electronics'), ('English'), ('Bangla'), ('Accounting')
on conflict (name) do nothing;

insert into public.skills (name) values
  ('JavaScript'), ('TypeScript'), ('React'), ('React Native'), ('Python'),
  ('Java'), ('C'), ('C++'), ('SQL'), ('Machine Learning'),
  ('UI/UX Design'), ('Public Speaking'), ('Leadership'), ('Technical Writing')
on conflict (name) do nothing;

insert into public.tags (name) values
  ('remote'), ('on-site'), ('paid'), ('free'), ('beginner-friendly'),
  ('for-women'), ('final-year'), ('certificate-included')
on conflict (name) do nothing;

-- ── Opportunity categories ──────────────────────────────────────────────────

insert into public.opportunity_categories (name, opportunity_type, sort_order) values
  ('Company Internship', 'internship', 1),
  ('Research Internship', 'internship', 2),
  ('Local Scholarship', 'scholarship', 1),
  ('International Scholarship', 'scholarship', 2),
  ('Skill Workshop', 'workshop', 1),
  ('Bootcamp', 'workshop', 2),
  ('Tech Meetup', 'event', 1),
  ('Competition', 'event', 2),
  ('Career Mentorship', 'mentorship', 1)
on conflict (name) do nothing;

-- ── Sample opportunities (replace with real admin-created content) ──────────

insert into public.opportunities (
  id, type, title, organization_name, summary, description, location,
  opportunity_mode, eligibility, application_url, deadline, category_id,
  published_at, status, featured, verified, source_name, source_url
) values
  ('22222222-2222-2222-2222-222222222201', 'internship',
   'Junior React Developer Intern', 'Decode Labs',
   'Paid 3-month remote internship building production React apps.',
   'Join our web team to build and ship features across client projects. You will pair with senior engineers, join sprint rituals, and own small features end to end. A stipend is provided.',
   'Remote (Bangladesh)', 'remote',
   'Undergraduate students in CSE/EEE with basic React knowledge.',
   'https://example.com/apply/react-intern', now() + interval '21 days',
   (select id from public.opportunity_categories where name = 'Company Internship'),
   now() - interval '2 days', 'published', true, true, 'KSE Team', null),

  ('22222222-2222-2222-2222-222222222202', 'internship',
   'Research Assistant — IoT Lab', 'KUET IoT Research Lab',
   'On-campus part-time research internship on IoT prototyping.',
   'Assist graduate researchers with sensor data collection, firmware experiments and paper drafting. 10 hours per week on campus.',
   'KUET Campus, Khulna', 'onsite',
   'KUET EEE/CSE students from 2nd year onwards.',
   'https://example.com/apply/iot-ra', now() + interval '14 days',
   (select id from public.opportunity_categories where name = 'Research Internship'),
   now() - interval '5 days', 'published', false, true, 'KSE Team', null),

  ('22222222-2222-2222-2222-222222222203', 'scholarship',
   'ICT Division Scholarship 2026', 'Government of Bangladesh',
   'Full tuition waiver plus monthly stipend for ICT students.',
   'The ICT Division awards need-based scholarships covering full tuition and a monthly stipend for students in ICT-related disciplines at registered universities.',
   'Bangladesh', null,
   'Undergraduate ICT-discipline students with strong academic results.',
   'https://example.com/apply/ict-scholarship', now() + interval '30 days',
   (select id from public.opportunity_categories where name = 'Local Scholarship'),
   now() - interval '7 days', 'published', true, true, 'KSE Team', null),

  ('22222222-2222-2222-2222-222222222204', 'scholarship',
   'Global STEM Exchange Fellowship', 'World STEM Foundation',
   'Partial funding for a semester exchange at partner universities abroad.',
   'Fellowship covering travel and living costs for one exchange semester at selected partner universities in Asia and Europe.',
   'International', null,
   'Undergraduate students in STEM fields, IELTS 6.0 or equivalent.',
   'https://example.com/apply/stem-fellowship', now() + interval '45 days',
   (select id from public.opportunity_categories where name = 'International Scholarship'),
   now() - interval '3 days', 'published', false, true, 'KSE Team', null),

  ('22222222-2222-2222-2222-222222222205', 'workshop',
   'Hands-on GitHub & Open Source', 'KSE Community',
   'Free beginner workshop: Git basics to your first pull request.',
   'A three-hour guided session covering repositories, branching, pull requests and finding good-first-issues. Bring a laptop.',
   'Khulna University Campus', 'onsite',
   'All students. No prior Git experience required.',
   'https://example.com/apply/git-workshop', now() + interval '10 days',
   (select id from public.opportunity_categories where name = 'Skill Workshop'),
   now() - interval '1 day', 'published', false, true, 'KSE Team', null),

  ('22222222-2222-2222-2222-222222222206', 'event',
   'Khulna Tech Meetup Vol. 12', 'Khulna Tech Community',
   'Evening meetup: talks on local startups, AI tooling and hiring.',
   'Three lightning talks, a panel with local founders and open networking. Registration is free but seats are limited.',
   'Khulna City', 'onsite',
   'Students and early-career professionals.',
   'https://example.com/apply/tech-meetup', now() + interval '18 days',
   (select id from public.opportunity_categories where name = 'Tech Meetup'),
   now() - interval '4 days', 'published', true, true, 'KSE Team', null)
on conflict (id) do nothing;

-- Tag a few samples
insert into public.opportunity_tags (opportunity_id, tag_id)
select o.id, t.id
from public.opportunities o
join public.tags t on t.name in ('remote', 'paid')
where o.id = '22222222-2222-2222-2222-222222222201'
on conflict do nothing;

insert into public.opportunity_tags (opportunity_id, tag_id)
select o.id, t.id
from public.opportunities o
join public.tags t on t.name = 'free'
where o.id in ('22222222-2222-2222-2222-222222222205', '22222222-2222-2222-2222-222222222206')
on conflict do nothing;

-- ── Sample community ────────────────────────────────────────────────────────

insert into public.communities (name, slug, description, university_id, status) values
  ('KUET CSE Club', 'kuet-cse-club',
   'Programming contests, tech talks and peer support for CSE students.',
   (select id from public.universities where short_name = 'KUET'), 'active')
on conflict (slug) do nothing;

-- ── Default app settings ────────────────────────────────────────────────────

insert into public.app_settings (key, value, description) values
  ('maintenance_mode', 'false', 'When true, the mobile app shows a maintenance screen.'),
  ('support_contact', '"support@kse.app"', 'Displayed on the support screen.'),
  ('terms_url', '"https://kse.app/terms"', 'Terms of Service URL.'),
  ('privacy_url', '"https://kse.app/privacy"', 'Privacy Policy URL.'),
  ('min_app_version', '"1.0.0"', 'Minimum supported mobile app version.'),
  ('feature_flags', '{}', 'Client feature toggles.')
on conflict (key) do nothing;

-- ── Local admin account for the admin panel (roadmap step 6) ────────────────
-- Password: admin12345 — local dev only; do not use in production.

insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '22222222-2222-2222-2222-222222222201', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'admin@kse.local',
  extensions.crypt('admin12345', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"KSE Admin"}',
  now(), now(),
  '', '', '', ''
)
on conflict (id) do update
  set encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '22222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222201',
  '22222222-2222-2222-2222-222222222201',
  '{"sub":"22222222-2222-2222-2222-222222222201","email":"admin@kse.local","email_verified":true}'::jsonb,
  'email', now(), now(), now()
)
on conflict (id) do update set identity_data = excluded.identity_data;

-- The signup trigger granted 'student'; staff role is what the admin panel gates on.
insert into public.user_roles (user_id, role)
values ('22222222-2222-2222-2222-222222222201', 'admin')
on conflict (user_id, role) do nothing;

delete from public.user_roles
where user_id = '22222222-2222-2222-2222-222222222201' and role = 'student';

update public.profiles set full_name = 'KSE Admin'
where id = '22222222-2222-2222-2222-222222222201';

-- ── Opportunity categories + starter tags (roadmap step 7) ──────────────────

insert into public.opportunity_categories (name, opportunity_type, sort_order) values
  ('Internship', 'internship', 1),
  ('Full-time Track', 'internship', 2),
  ('Local Scholarship', 'scholarship', 1),
  ('International Scholarship', 'scholarship', 2),
  ('Tech Event', 'event', 1),
  ('Campus Event', 'event', 2),
  ('Skill Workshop', 'workshop', 1),
  ('Career Workshop', 'workshop', 2),
  ('Mentorship Program', 'mentorship', 1)
on conflict (name) do nothing;

insert into public.tags (name) values
  ('software'), ('data'), ('design'), ('marketing'), ('finance'),
  ('research'), ('engineering'), ('remote-friendly'), ('freshman-friendly'),
  ('women-in-tech'), ('freelancing'), ('higher-study')
on conflict (name) do nothing;

-- ── Scholarship structured fields (migration 20260907120000, spec §6) ───────

update public.opportunities set
  degree_level = 'undergraduate', funding_type = 'full', country = 'Bangladesh'
where id = '22222222-2222-2222-2222-222222222203';

update public.opportunities set
  degree_level = 'undergraduate', funding_type = 'partial', country = 'Multiple countries'
where id = '22222222-2222-2222-2222-222222222204';
