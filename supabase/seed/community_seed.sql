-- Community demo data — applied by `supabase db reset` after seed.sql.
-- Fixed UUIDs + on-conflict guards keep it idempotent.

-- ── Communities across categories ────────────────────────────────────────────

update public.communities set
  category_id = (select id from public.community_categories where slug = 'department'),
  department_id = (select d.id from public.departments d
                   join public.universities u on u.id = d.university_id
                   where u.short_name = 'KUET' and d.code = 'CSE')
where slug = 'kuet-cse-club';

insert into public.communities (id, name, slug, description, university_id, department_id, category_id, created_by, status) values
  ('33333333-3333-3333-3333-333333333311', 'KUET Robotics Club',
   'kuet-robotics-club',
   'Build line-follower and soccer robots together. Weekly lab sessions and national contest prep.',
   (select id from public.universities where short_name = 'KUET'),
   (select d.id from public.departments d join public.universities u on u.id = d.university_id
    where u.short_name = 'KUET' and d.code = 'EEE'),
   (select id from public.community_categories where slug = 'department'),
   '22222222-2222-2222-2222-222222222201', 'active'),

  ('33333333-3333-3333-3333-333333333312', 'Khulna Coders Community',
   'khulna-coders-community',
   'Competitive programming, JavaScript and Python practice for students across Khulna universities.',
   null, null,
   (select id from public.community_categories where slug = 'skills'),
   '22222222-2222-2222-2222-222222222211', 'active'),

  ('33333333-3333-3333-3333-333333333313', 'Web Development Career Track',
   'web-dev-career-track',
   'From first HTML page to first junior job: roadmaps, portfolio reviews and internship leads.',
   null, null,
   (select id from public.community_categories where slug = 'career'),
   '22222222-2222-2222-2222-222222222201', 'active'),

  ('33333333-3333-3333-3333-333333333314', 'Higher Study Bangladesh',
   'higher-study-bd',
   'GRE/IELTS prep, university shortlisting, SOP reviews and scholarship deadlines for abroad study.',
   null, null,
   (select id from public.community_categories where slug = 'career'),
   '22222222-2222-2222-2222-222222222201', 'active'),

  ('33333333-3333-3333-3333-333333333315', 'Photography Club Khulna',
   'photography-club-khulna',
   'Campus photowalks, editing sessions and friendly monthly theme contests.',
   null, null,
   (select id from public.community_categories where slug = 'interest'),
   '22222222-2222-2222-2222-222222222212', 'active'),

  ('33333333-3333-3333-3333-333333333316', 'KUET EEE Society',
   'kuet-eee-society',
   'Department society for EEE students: seminars, industrial tours and senior-junior mentoring.',
   (select id from public.universities where short_name = 'KUET'),
   (select d.id from public.departments d join public.universities u on u.id = d.university_id
    where u.short_name = 'KUET' and d.code = 'EEE'),
   (select id from public.community_categories where slug = 'department'),
   '22222222-2222-2222-2222-222222222201', 'active')
on conflict (slug) do nothing;

-- ── Rules ────────────────────────────────────────────────────────────────────

insert into public.community_rules (community_id, content, sort_order)
select c.id, r.content, r.ord
from public.communities c
join (values
  ('kuet-cse-club',         'Be respectful — no personal attacks or harassment.', 1),
  ('kuet-cse-club',         'Keep posts relevant to CSE studies, contests and tech.', 2),
  ('kuet-cse-club',         'No spam or unpaid promotion without moderator approval.', 3),
  ('khulna-coders-community','English or Bangla — both are welcome.', 1),
  ('khulna-coders-community','Share code as links (GitHub/pastebin), not screenshots.', 2),
  ('web-dev-career-track',  'Portfolio review requests must include your own attempt first.', 1)
) as r(slug, content, ord) on r.slug = c.slug
on conflict do nothing;

-- ── Members (member_count follows via trigger) ───────────────────────────────

insert into public.community_members (community_id, user_id, role)
select c.id, m.user_id::uuid, m.role::public.community_member_role
from public.communities c
join (values
  ('kuet-cse-club',          '22222222-2222-2222-2222-222222222201', 'owner'),
  ('kuet-cse-club',          '22222222-2222-2222-2222-222222222211', 'member'),
  ('kuet-cse-club',          '22222222-2222-2222-2222-222222222212', 'member'),
  ('khulna-coders-community','22222222-2222-2222-2222-222222222211', 'owner'),
  ('khulna-coders-community','22222222-2222-2222-2222-222222222201', 'moderator'),
  ('khulna-coders-community','22222222-2222-2222-2222-222222222213', 'member'),
  ('web-dev-career-track',   '22222222-2222-2222-2222-222222222201', 'owner'),
  ('web-dev-career-track',   '22222222-2222-2222-2222-222222222212', 'moderator'),
  ('kuet-robotics-club',     '22222222-2222-2222-2222-222222222213', 'owner'),
  ('photography-club-khulna','22222222-2222-2222-2222-222222222212', 'owner')
) as m(slug, user_id, role) on m.slug = c.slug
on conflict do nothing;

-- ── Posts of every type ──────────────────────────────────────────────────────

insert into public.community_posts (id, community_id, author_id, post_type, content, image_url, link_url, status, created_at) values
  ('44444444-4444-4444-4444-444444444411',
   (select id from public.communities where slug = 'khulna-coders-community'),
   '22222222-2222-2222-2222-222222222211', 'discussion',
   'Weekly contest this Friday 8 PM — we will solve the last Div. 3 set together on whiteboard first, then code. Beginners very welcome.',
   null, null, 'active', now() - interval '2 days'),

  ('44444444-4444-4444-4444-444444444412',
   (select id from public.communities where slug = 'kuet-cse-club'),
   '22222222-2222-2222-2222-222222222212', 'question',
   'Struggling to choose between PostgreSQL and MongoDB for my 3rd year project (event booking app). Any seniors tried both?',
   null, null, 'active', now() - interval '1 day'),

  ('44444444-4444-4444-4444-444444444413',
   (select id from public.communities where slug = 'web-dev-career-track'),
   '22222222-2222-2222-2222-222222222201', 'opportunity',
   'Decode Labs opened 3 junior React intern seats — remote, paid, 3 months. Deadline in ~3 weeks. Apply link below; ping me if you want a portfolio review before applying.',
   null, 'https://example.com/apply/react-intern', 'active', now() - interval '5 hours'),

  ('44444444-4444-4444-4444-444444444414',
   (select id from public.communities where slug = 'kuet-cse-club'),
   '22222222-2222-2222-2222-222222222201', 'announcement',
   'Semester meetup confirmed: Saturday 4 PM, CSE Seminar Room. Agenda: ACM ICPC regional team formation + club membership renewal.',
   null, null, 'active', now() - interval '3 hours'),

  ('44444444-4444-4444-4444-444444444415',
   (select id from public.communities where slug = 'khulna-coders-community'),
   '22222222-2222-2222-2222-222222222213', 'poll',
   'Which track should the Khulna Coders winter bootcamp focus on?',
   null, null, 'active', now() - interval '10 hours')
on conflict (id) do nothing;

-- ── Poll ─────────────────────────────────────────────────────────────────────

insert into public.community_polls (id, post_id, closes_at, result_visibility) values
  ('55555555-5555-5555-5555-555555555501',
   '44444444-4444-4444-4444-444444444415',
   now() + interval '3 days', 'after_vote')
on conflict (post_id) do nothing;

insert into public.community_poll_options (id, poll_id, option_text, sort_order) values
  ('55555555-5555-5555-5555-555555555511', '55555555-5555-5555-5555-555555555501', 'Problem solving (DSA)', 1),
  ('55555555-5555-5555-5555-555555555512', '55555555-5555-5555-5555-555555555501', 'Full-stack web (React + Node)', 2),
  ('55555555-5555-5555-5555-555555555513', '55555555-5555-5555-5555-555555555501', 'Python for data/AI', 3),
  ('55555555-5555-5555-5555-555555555514', '55555555-5555-5555-5555-555555555501', 'Mobile apps (React Native)', 4)
on conflict (id) do nothing;

insert into public.community_poll_votes (poll_id, option_id, user_id) values
  ('55555555-5555-5555-5555-555555555501', '55555555-5555-5555-5555-555555555511', '22222222-2222-2222-2222-222222222211'),
  ('55555555-5555-5555-5555-555555555501', '55555555-5555-5555-5555-555555555512', '22222222-2222-2222-2222-222222222213')
on conflict do nothing;

-- ── Comments and one-level replies ───────────────────────────────────────────

insert into public.community_comments (id, post_id, author_id, parent_id, content, status, created_at) values
  ('66666666-6666-6666-6666-666666666601', '44444444-4444-4444-4444-444444444412',
   '22222222-2222-2222-2222-222222222201', null,
   'For a booking app start with PostgreSQL — you will want transactions and joins. MongoDB only makes sense if the schema is truly document-shaped.',
   'active', now() - interval '20 hours'),
  ('66666666-6666-6666-6666-666666666602', '44444444-4444-4444-4444-444444444412',
   '22222222-2222-2222-2222-222222222212', '66666666-6666-6666-6666-666666666601',
   'Thank you! That matches what our DB teacher hinted at.',
   'active', now() - interval '18 hours'),
  ('66666666-6666-6666-6666-666666666603', '44444444-4444-4444-4444-444444444411',
   '22222222-2222-2222-2222-222222222201', null,
   ' Joined last week''s session — the whiteboard-first approach really helps. See everyone Friday.',
   'active', now() - interval '1 day')
on conflict (id) do nothing;

-- ── Reactions (reaction_count follows via trigger) ───────────────────────────

insert into public.community_reactions (post_id, user_id) values
  ('44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222201'),
  ('44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222212'),
  ('44444444-4444-4444-4444-444444444412', '22222222-2222-2222-2222-222222222211'),
  ('44444444-4444-4444-4444-444444444413', '22222222-2222-2222-2222-222222222212'),
  ('44444444-4444-4444-4444-444444444413', '22222222-2222-2222-2222-222222222213'),
  ('44444444-4444-4444-4444-444444444413', '22222222-2222-2222-2222-222222222211')
on conflict do nothing;

-- ── Pinned announcement ──────────────────────────────────────────────────────

insert into public.community_pins (community_id, post_id, pinned_by)
select p.community_id, p.id, p.author_id
from public.community_posts p
where p.id = '44444444-4444-4444-4444-444444444414'
on conflict (post_id) do nothing;

-- ── Events ───────────────────────────────────────────────────────────────────

insert into public.community_events (id, community_id, title, description, starts_at, ends_at, location, mode, meeting_url, organizer, image_url, created_by, status) values
  ('77777777-7777-7777-7777-777777777701',
   (select id from public.communities where slug = 'kuet-cse-club'),
   'ACM ICPC Team Formation Meetup',
   'Form 3-person teams for the regional round, pick practice tracks and meet the coach. Bring your solved-problem count.',
   now() + interval '4 days' + interval '2 hours', now() + interval '4 days' + interval '4 hours',
   'CSE Seminar Room 201, KUET', 'offline', null, 'KUET CSE Club', null,
   '22222222-2222-2222-2222-222222222201', 'active'),

  ('77777777-7777-7777-7777-777777777702',
   (select id from public.communities where slug = 'khulna-coders-community'),
   'Online: Graph Algorithms Crash Session',
   'Two-hour Zoom session covering BFS/DFS, shortest paths and union-find with live problem solving.',
   now() + interval '2 days' + interval '3 hours', now() + interval '2 days' + interval '5 hours',
   null, 'online', 'https://zoom.us/j/demo-kse-coders', 'Khulna Coders Community', null,
   '22222222-2222-2222-2222-222222222211', 'active')
on conflict (id) do nothing;

insert into public.community_event_attendees (event_id, user_id, rsvp) values
  ('77777777-7777-7777-7777-777777777701', '22222222-2222-2222-2222-222222222211', 'attending'),
  ('77777777-7777-7777-7777-777777777701', '22222222-2222-2222-2222-222222222212', 'interested'),
  ('77777777-7777-7777-7777-777777777702', '22222222-2222-2222-2222-222222222201', 'attending')
on conflict do nothing;

-- ── One pending creation request + one open report (admin review demo) ──────

insert into public.community_requests (id, requested_by, name, category_id, description, purpose, university_id, proposed_rules, status) values
  ('88888888-8888-8888-8888-888888888801',
   '22222222-2222-2222-2222-222222222212',
   'Khulna Debate Forum',
   (select id from public.community_categories where slug = 'interest'),
   'A community for inter-university debate practice, motion discussions and tournament announcements across Khulna.',
   'Students from 4 universities asked for one place to coordinate joint debate events instead of scattered messenger groups.',
   (select id from public.universities where short_name = 'KhU'),
   '["English and Bangla motions are both allowed", "No political campaigning"]'::jsonb,
   'pending')
on conflict (id) do nothing;

insert into public.reports (reporter_id, target_type, target_id, reason, details, status) values
  ('22222222-2222-2222-2222-222222222213', 'community_post',
   '44444444-4444-4444-4444-444444444411', 'Spam',
   'The same contest message was posted in three other groups today.', 'open')
on conflict do nothing;
