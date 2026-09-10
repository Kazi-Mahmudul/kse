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

-- ── Tutor demo data (roadmap step 15) ────────────────────────────────────────
-- Password: tutor12345 — local dev only; do not use in production.

insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values
  ('22222222-2222-2222-2222-222222222211', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tutor1@kse.local', extensions.crypt('tutor12345', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Tanvir Ahmed"}', now(), now(), '', '', '', ''),
  ('22222222-2222-2222-2222-222222222212', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tutor2@kse.local', extensions.crypt('tutor12345', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Nusrat Jahan"}', now(), now(), '', '', '', ''),
  ('22222222-2222-2222-2222-222222222213', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tutor3@kse.local', extensions.crypt('tutor12345', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Rafiul Islam"}', now(), now(), '', '', '', '')
on conflict (id) do update
  set encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  ('22222222-2222-2222-2222-222222222211', '22222222-2222-2222-2222-222222222211',
   '22222222-2222-2222-2222-222222222211',
   '{"sub":"22222222-2222-2222-2222-222222222211","email":"tutor1@kse.local","email_verified":true}'::jsonb,
   'email', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222212', '22222222-2222-2222-2222-222222222212',
   '22222222-2222-2222-2222-222222222212',
   '{"sub":"22222222-2222-2222-2222-222222222212","email":"tutor2@kse.local","email_verified":true}'::jsonb,
   'email', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222213', '22222222-2222-2222-2222-222222222213',
   '22222222-2222-2222-2222-222222222213',
   '{"sub":"22222222-2222-2222-2222-222222222213","email":"tutor3@kse.local","email_verified":true}'::jsonb,
   'email', now(), now(), now())
on conflict (id) do update set identity_data = excluded.identity_data;

-- The signup trigger granted 'student'; swap it for the tutor role.
insert into public.user_roles (user_id, role)
values
  ('22222222-2222-2222-2222-222222222211', 'tutor'),
  ('22222222-2222-2222-2222-222222222212', 'tutor'),
  ('22222222-2222-2222-2222-222222222213', 'tutor')
on conflict (user_id, role) do nothing;

delete from public.user_roles
where user_id in ('22222222-2222-2222-2222-222222222211',
                  '22222222-2222-2222-2222-222222222212',
                  '22222222-2222-2222-2222-222222222213')
  and role = 'student';

update public.profiles set full_name = 'Tanvir Ahmed'
where id = '22222222-2222-2222-2222-222222222211';
update public.profiles set full_name = 'Nusrat Jahan'
where id = '22222222-2222-2222-2222-222222222212';
update public.profiles set full_name = 'Rafiul Islam'
where id = '22222222-2222-2222-2222-222222222213';

insert into public.tutors (id, headline, bio, university_id, location, expected_fee_min, expected_fee_max, availability, is_verified, status) values
  ('22222222-2222-2222-2222-222222222211', 'CSE undergrad teaching programming fundamentals',
   'Third-year KUET CSE student. I run small-group sessions for C, DSA and OOP with hands-on problem solving.',
   '11111111-1111-1111-1111-111111111102', 'Khulna', 3000, 5000, 'Evenings & weekends', true, 'active'),
  ('22222222-2222-2222-2222-222222222212', 'Math & physics tutor for HSC and first-year students',
   'EEE student at KUET with 3 years of tutoring experience. Focus on concept building and exam preparation.',
   '11111111-1111-1111-1111-111111111102', 'Khulna', 2000, 3500, 'After 5pm, weekdays', true, 'active'),
  ('22222222-2222-2222-2222-222222222213', 'Biology & chemistry tutor (Bangla medium)',
   'MBBS student offering biology and chemistry classes for SSC/HSC candidates near Sonadanga.',
   null, 'Khulna (Sonadanga)', 2500, 4000, 'Fridays & Saturdays', true, 'active')
on conflict (id) do update
  set headline = excluded.headline, bio = excluded.bio, university_id = excluded.university_id,
      location = excluded.location, expected_fee_min = excluded.expected_fee_min,
      expected_fee_max = excluded.expected_fee_max, availability = excluded.availability,
      is_verified = excluded.is_verified, status = excluded.status;

insert into public.tutor_subjects (tutor_id, subject_id)
select '22222222-2222-2222-2222-222222222211', id from public.subjects
where name in ('Programming in C', 'Data Structures and Algorithms', 'Object-Oriented Programming')
on conflict do nothing;

insert into public.tutor_subjects (tutor_id, subject_id)
select '22222222-2222-2222-2222-222222222212', id from public.subjects
where name in ('Mathematics', 'Physics')
on conflict do nothing;

insert into public.tutor_subjects (tutor_id, subject_id)
select '22222222-2222-2222-2222-222222222213', id from public.subjects
where name in ('Chemistry', 'Biology')
on conflict do nothing;

-- ── Demo student (community member persona) ──────────────────────────────────
-- Password: student12345 — local dev only; do not use in production.

insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values
  ('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student1@kse.local', extensions.crypt('student12345', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Sadia Rahman"}', now(), now(), '', '', '', '')
on conflict (id) do update
  set encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  ('22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222221',
   '22222222-2222-2222-2222-222222222221',
   '{"sub":"22222222-2222-2222-2222-222222222221","email":"student1@kse.local","email_verified":true}'::jsonb,
   'email', now(), now(), now())
on conflict (id) do update set identity_data = excluded.identity_data;

-- The signup trigger already granted the default 'student' role and profile.

update public.profiles set full_name = 'Sadia Rahman'
where id = '22222222-2222-2222-2222-222222222221';

-- ── Community demo data (roadmap step 16) ────────────────────────────────────

insert into public.communities (id, name, slug, description, university_id, cover_image_url, status) values
  ('33333333-3333-3333-3333-333333333301', 'Khulna Writers Circle', 'khulna-writers',
   'Short story, poetry and essay workshops for students from any university in Khulna.',
   null, null, 'active'),
  ('33333333-3333-3333-3333-333333333302', 'KU Robotics Society', 'kuet-robotics',
   'Line follower, Sumo bot, drone + Arduino practice sessions every other Friday.',
   '11111111-1111-1111-1111-111111111102', null, 'active'),
  ('33333333-3333-3333-3333-333333333303', 'North Western BCS Prep', 'nwu-bcs-prep',
   'BCS preliminary + written prep group running since 2022.',
   '11111111-1111-1111-1111-111111111103', null, 'active')
on conflict (id) do update
  set name = excluded.name, description = excluded.description, status = excluded.status;

insert into public.community_members (community_id, user_id, role) values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222221', 'member'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222221', 'member'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'owner'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222221', 'member')
on conflict (community_id, user_id) do update
  set role = excluded.role;

-- Posts: 2 announcements (announcement=true via the kiosk role 'owner') + 3 regular posts.
insert into public.community_posts (id, community_id, author_id, content, is_announcement, status) values
  ('44444444-4444-4444-4444-444444444401',
   '33333333-3333-3333-3333-333333333301',
   '22222222-2222-2222-2222-222222222201',
   'Welcome to Khulna Writers Circle! Drop a topic you want to workshop next week.', true, 'active'),
  ('44444444-4444-4444-4444-444444444402',
   '33333333-3333-3333-3333-333333333302',
   '22222222-2222-2222-2222-222222222201',
   'Robotics session moved to Sat 5pm in EE lab 2. Bring your hardware kits.', true, 'active'),
  ('44444444-4444-4444-4444-444444444403',
   '33333333-3333-3333-3333-333333333301',
   '22222222-2222-2222-2222-222222222221',
   'Anyone open to beta-reading a 1500-word short story this weekend?', false, 'active'),
  ('44444444-4444-4444-4444-444444444404',
   '33333333-3333-3333-3333-333333333302',
   '22222222-2222-2222-2222-222222222221',
   'Got the IR sensor working today thanks to Nusrat''s wiring tip.', false, 'active'),
  ('44444444-4444-4444-4444-444444444405',
   '33333333-3333-3333-3333-333333333303',
   '22222222-2222-2222-2222-222222222221',
   'Sharing my BCS Bangla notes (math + GK) to the group email tonight.', false, 'active')
on conflict (id) do update
  set content = excluded.content, is_announcement = excluded.is_announcement;

-- ── Notification demo data (roadmap step 17) ────────────────────────────────

insert into public.notifications (id, user_id, type, title, body, data, opportunity_id) values
  ('55555555-5555-5555-5555-555555555501',
   '22222222-2222-2222-2222-222222222201',
   'deadline_reminder',
   'Deadline approaching: Brain Station 23 Internship 2026',
   'The application for the Brain Station 23 Summer Internship closes in 5 days. Tap to review the requirements and submit.',
   '{"opportunity_type":"internship"}'::jsonb,
   '22222222-2222-2222-2222-222222222201'),
  ('55555555-5555-5555-5555-555555555502',
   '22222222-2222-2222-2222-222222222201',
   'community_announcement',
   'Robotics session moved to Saturday 5pm',
   'KU Robotics Society owner posted a new announcement. Join in EE Lab 2 with your hardware kits.',
   '{"opportunity_type":"event","community_id":"33333333-3333-3333-3333-333333333302"}'::jsonb,
   '22222222-2222-2222-2222-222222222206'),
  ('55555555-5555-5555-5555-555555555503',
   '22222222-2222-2222-2222-222222222201',
   'new_opportunity',
   'New scholarship match: DAAD WISE 2026',
   'A new scholarship matching your Computer Science profile was published yesterday. Application closes in 11 days.',
   '{"opportunity_type":"scholarship"}'::jsonb,
   '22222222-2222-2222-2222-222222222204'),
  ('55555555-5555-5555-5555-555555555504',
   '22222222-2222-2222-2222-222222222201',
   'event_upcoming',
   'Cloud Native Khulna meetup happening Friday',
   'Tomorrow''s monthly meetup at KUET auditorium covers Kubernetes 1.31. RSVP opens at noon.',
   '{"opportunity_type":"event"}'::jsonb,
   '22222222-2222-2222-2222-222222222206')
on conflict (id) do update
  set title = excluded.title, body = excluded.body, data = excluded.data,
      opportunity_id = excluded.opportunity_id;

insert into public.notification_deliveries (notification_id, channel, status, sent_at) values
  ('55555555-5555-5555-5555-555555555501', 'in_app', 'sent',     now() - interval '2 hour'),
  ('55555555-5555-5555-5555-555555555502', 'in_app', 'sent',     now() - interval '6 hour'),
  ('55555555-5555-5555-5555-555555555503', 'in_app', 'sent',     now() - interval '1 day'),
  ('55555555-5555-5555-5555-555555555504', 'in_app', 'sent',     now() - interval '30 minute')
on conflict do nothing;

-- ── Portfolio demo data (roadmap step 18) ────────────────────────────────

-- A handful of skills attached to the demo student.
insert into public.user_skills (user_id, skill_id, level) values
  ('22222222-2222-2222-2222-222222222201',
     (select id from public.skills where name = 'React Native'), 'advanced'),
  ('22222222-2222-2222-2222-222222222201',
     (select id from public.skills where name = 'TypeScript'),  'advanced'),
  ('22222222-2222-2222-2222-222222222201',
     (select id from public.skills where name = 'Python'),      'intermediate')
on conflict (user_id, skill_id) do update
  set level = excluded.level;

-- Projects, certificates, achievements, research, resumes + links.
insert into public.user_projects (id, user_id, title, description, url, tech_stack, started_on, completed_on) values
  ('66666666-6666-6666-6666-666666666601',
   '22222222-2222-2222-2222-222222222201',
   'Khulna Bus Tracker',
   'Live GPS feed of Khulna city buses using Expo + a 200-line Crowdsourced route API.',
   'https://github.com/demo/khulna-bus-tracker',
   array['React Native','Node.js','PostgreSQL'],
   '2026-02-12', '2026-04-30'),
  ('66666666-6666-6666-6666-666666666602',
   '22222222-2222-2222-2222-222222222201',
   'KUET Course Review',
   'A directory + rating site for KUET courses, built during a hackathon.',
   'https://github.com/demo/kuet-courses',
   array['Next.js','Tailwind','Supabase'],
   '2026-05-01', null)
on conflict (id) do update
  set title = excluded.title, description = excluded.description, url = excluded.url,
      tech_stack = excluded.tech_stack, started_on = excluded.started_on,
      completed_on = excluded.completed_on;

insert into public.user_certificates (id, user_id, title, issuer, issued_on, file_url) values
  ('66666666-6666-6666-6666-666666666610',
   '22222222-2222-2222-2222-222222222201',
   'AWS Cloud Practitioner Essentials',
   'AWS Training', '2026-03-22',
   'https://drive.google.com/file/d/sample-aws-ccp/view'),
  ('66666666-6666-6666-6666-666666666611',
   '22222222-2222-2222-2222-222222222201',
   'HSC Board Scholarship',
   'Ministry of Education, Bangladesh', '2024-05-10', null)
on conflict (id) do update
  set title = excluded.title, issuer = excluded.issuer, issued_on = excluded.issued_on,
      file_url = excluded.file_url;

insert into public.user_achievements (id, user_id, title, description, achieved_on) values
  ('66666666-6666-6666-6666-666666666620',
   '22222222-2222-2222-2222-222222222201',
   'Top 5 finish — Khulna AI Hackathon 2026',
   'Built a Bangla voice assistant for local news in under 48 hours.',
   '2026-06-15'),
  ('66666666-6666-6666-6666-666666666621',
   '22222222-2222-2222-2222-222222222201',
   'Volunteer of the year — KUET IEEE Branch',
   'Organized 12 sessions on web dev basics for first-year students.',
   '2025-12-20')
on conflict (id) do update
  set title = excluded.title, description = excluded.description,
      achieved_on = excluded.achieved_on;

insert into public.user_research (id, user_id, title, abstract, role, collaborators, url, published_on) values
  ('66666666-6666-6666-6666-666666666630',
   '22222222-2222-2222-2222-222222222201',
   'Edge-deployable keyword spotting for Bangla speech',
   'A study comparing quantized CNN vs RNN keyword spotters running on a Raspberry Pi 4 for Bangla voice commands.',
   'First author',
   array['Nusrat Jahan','Rafiul Islam'],
   'https://doi.org/10.0000/demo.kwspot',
   '2026-05-30')
on conflict (id) do update
  set title = excluded.title, abstract = excluded.abstract, role = excluded.role,
      collaborators = excluded.collaborators, url = excluded.url,
      published_on = excluded.published_on;

insert into public.user_resumes (id, user_id, file_url, is_primary) values
  ('66666666-6666-6666-6666-666666666640',
   '22222222-2222-2222-2222-222222222201',
   'https://drive.google.com/file/d/sample-resume-v2/view',
   true)
on conflict (id) do update
  set file_url = excluded.file_url, is_primary = excluded.is_primary;

insert into public.user_portfolio_links (id, user_id, label, url, position) values
  ('66666666-6666-6666-6666-666666666650',
   '22222222-2222-2222-2222-222222222201',
   'GitHub',  'https://github.com/demo-student', 0),
  ('66666666-6666-6666-6666-666666666651',
   '22222222-2222-2222-2222-222222222201',
   'LinkedIn','https://www.linkedin.com/in/demo-student', 1),
  ('66666666-6666-6666-6666-666666666652',
   '22222222-2222-2222-2222-222222222201',
   'Personal site', 'https://demo.student.dev', 2)
on conflict (id) do update
  set label = excluded.label, url = excluded.url, position = excluded.position;
