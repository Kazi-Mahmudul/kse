-- RLS regression tests (spec §29 "RLS permissions").
-- pgTAP run via `supabase db test`.
--
-- Supabase RLS reads auth.uid() from request.jwt.claims, so impersonation
-- sets that config with the user's UUID and assumes the `authenticated` role.

begin;
-- pgTAP is not part of any migration; install it per-run so `db test` is
-- self-contained after `db reset` (extension installs don't survive resets).
create extension if not exists pgtap with schema extensions;
select plan(54);

-- ── Fixtures (created as postgres, which bypasses RLS) ─────────────────────

-- The handle_new_user trigger already inserts bare profiles for these rows,
-- so upsert the friendly names instead of plain-inserting (would duplicate).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000aa', 'a@test.kse', '{"full_name": "Student A"}'),
  ('00000000-0000-0000-0000-0000000000bb', 'b@test.kse', '{"full_name": "Student B"}');

insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-0000000000aa', 'Student A'),
  ('00000000-0000-0000-0000-0000000000bb', 'Student B')
on conflict (id) do update set full_name = excluded.full_name;

-- A draft opportunity that must never be visible to clients.
insert into public.opportunities (type, title, organization_name, status) values
  ('internship', 'Secret Draft Internship', 'Hidden Corp', 'draft');

create schema test;

-- ── Helpers ────────────────────────────────────────────────────────────────

create or replace function test.act_as(user_id uuid)
returns void
language plpgsql
as $fn$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text,
    true);
  set local role authenticated;
end;
$fn$;

-- ── Opportunities: published-only visibility ───────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select is(
  (select count(*) from public.opportunities),
  11::bigint,
  'authenticated users see only the 11 seeded published opportunities, not drafts'
);

select is(
  (select count(*) from public.opportunities where status <> 'published'),
  0::bigint,
  'no non-published opportunity is visible'
);

reset role;

-- Staff (granted content_manager) can see drafts.
insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-0000000000bb', 'content_manager');

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select is(
  (select count(*) from public.opportunities where status = 'draft'),
  1::bigint,
  'staff can see draft opportunities'
);

reset role;

-- ── Saved opportunities: owner-only ────────────────────────────────────────

insert into public.saved_opportunities (user_id, opportunity_id)
values ('00000000-0000-0000-0000-0000000000aa',
        '22222222-2222-2222-2222-222222222201');

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select is(
  (select count(*) from public.saved_opportunities),
  0::bigint,
  'another user cannot see my saved opportunities'
);

select throws_ok(
  $sql$insert into public.saved_opportunities (user_id, opportunity_id)
    values ('00000000-0000-0000-0000-0000000000aa',
            '22222222-2222-2222-2222-222222222202')$sql$,
  null,
  'cannot save an opportunity on behalf of another user'
);

reset role;

-- ── Event registrations: self-service only ─────────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select lives_ok(
  $sql$insert into public.event_registrations (user_id, opportunity_id)
    values ('00000000-0000-0000-0000-0000000000bb',
            '22222222-2222-2222-2222-222222222206')$sql$,
  'a user can register themselves for an event'
);

select throws_ok(
  $sql$insert into public.event_registrations (user_id, opportunity_id)
    values ('00000000-0000-0000-0000-0000000000aa',
            '22222222-2222-2222-2222-222222222206')$sql$,
  null,
  'cannot register another user for an event'
);

reset role;

-- ── Profiles: own-row updates only, protected columns guarded ──────────────

select test.act_as('00000000-0000-0000-0000-0000000000aa');

update public.profiles set bio = 'updated by A'
  where id = '00000000-0000-0000-0000-0000000000bb'; -- RLS hides B's row: 0 rows

select is(
  (select count(*) from public.profiles
   where id = '00000000-0000-0000-0000-0000000000bb' and bio = 'updated by A'),
  0::bigint,
  'cannot update another user profile'
);

select throws_ok(
  $sql$update public.profiles set is_verified = true
    where id = '00000000-0000-0000-0000-0000000000aa'$sql$,
  null,
  'owner cannot self-verify their profile'
);

reset role;

-- ── user_roles: never writable by clients ──────────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select throws_ok(
  $sql$insert into public.user_roles (user_id, role)
    values ('00000000-0000-0000-0000-0000000000aa', 'admin')$sql$,
  null,
  'users cannot grant themselves roles'
);

reset role;

-- ── Audit logs: service-only ───────────────────────────────────────────────

insert into public.audit_logs (action, entity_type)
values ('create', 'opportunity');

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select is(
  (select count(*) from public.audit_logs),
  0::bigint,
  'audit logs are invisible to clients'
);

reset role;

-- ── Notifications: recipient-only, content immutable ───────────────────────

insert into public.notifications (user_id, type, title, body)
values ('00000000-0000-0000-0000-0000000000aa', 'platform_announcement',
        'Welcome', 'Welcome to KSE');

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select is(
  (select count(*) from public.notifications),
  0::bigint,
  'cannot read another user notifications'
);

reset role;

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select lives_ok(
  $sql$update public.notifications set read_at = now()
    where title = 'Welcome'$sql$,
  'recipient can mark a notification as read'
);

select throws_ok(
  $sql$update public.notifications set body = 'tampered'
    where title = 'Welcome'$sql$,
  null,
  'recipient cannot edit notification content'
);

reset role;

-- ── Communities: membership required to post ───────────────────────────────

insert into public.community_members (community_id, user_id)
values ((select id from public.communities where slug = 'kuet-cse-club'),
        '00000000-0000-0000-0000-0000000000aa');

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select throws_ok(
  $sql$insert into public.community_posts (community_id, author_id, content)
    values ((select id from public.communities where slug = 'kuet-cse-club'),
            '00000000-0000-0000-0000-0000000000bb', 'not a member')$sql$,
  null,
  'non-members cannot post in a community'
);

reset role;

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select lives_ok(
  $sql$insert into public.community_posts (community_id, author_id, content)
    values ((select id from public.communities where slug = 'kuet-cse-club'),
            '00000000-0000-0000-0000-0000000000aa', 'hello world')$sql$,
  'members can post in their community'
);

reset role;

-- ── Full-text search sanity (spec §16) ─────────────────────────────────────

select is(
  (select count(*) from public.opportunities
   where search_vector @@ to_tsquery('simple', 'react')),
  2::bigint,
  'search_vector finds the React internships'
);

-- ── Signup auto-provisions profile + student role (spec §9) ────────────────

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000cc', 'c@test.kse',
        '{"full_name": "Student C"}');

select is(
  (select full_name from public.profiles
   where id = '00000000-0000-0000-0000-0000000000cc'),
  'Student C',
  'signup creates a profile with the provided full name'
);

select is(
  (select count(*) from public.user_roles
   where user_id = '00000000-0000-0000-0000-0000000000cc' and role = 'student'),
  1::bigint,
  'signup grants the default student role'
);

-- ── Community system (redesign): posts, moderation, polls, events ──────────
--
-- Roles under test: aa = plain member, bb = community moderator (+ staff),
-- cc = signed-up student with no membership.

insert into public.community_members (community_id, user_id, role)
values ((select id from public.communities where slug = 'kuet-cse-club'),
        '00000000-0000-0000-0000-0000000000bb', 'moderator');

-- Fixtures created as postgres (RLS bypass). Fixed markers identify rows.
insert into public.community_posts (community_id, author_id, post_type, content) values
  ((select id from public.communities where slug = 'kuet-cse-club'),
   '00000000-0000-0000-0000-0000000000aa', 'discussion', 'rls-test-post-p1'),
  ((select id from public.communities where slug = 'kuet-cse-club'),
   '00000000-0000-0000-0000-0000000000aa', 'discussion', 'rls-test-post-p2'),
  ((select id from public.communities where slug = 'kuet-cse-club'),
   '00000000-0000-0000-0000-0000000000aa', 'poll', 'rls-test-poll-after-vote'),
  ((select id from public.communities where slug = 'kuet-cse-club'),
   '00000000-0000-0000-0000-0000000000aa', 'poll', 'rls-test-poll-realtime'),
  ((select id from public.communities where slug = 'kuet-cse-club'),
   '00000000-0000-0000-0000-0000000000aa', 'poll', 'rls-test-poll-closed');

insert into public.community_polls (post_id, closes_at, result_visibility)
select p.id, x.closes_at, x.visibility
from public.community_posts p
join (values
  ('rls-test-poll-after-vote', now() + interval '2 days', 'after_vote'),
  ('rls-test-poll-realtime',   now() + interval '2 days', 'realtime'),
  ('rls-test-poll-closed',     now() - interval '1 hour', 'after_close')
) as x(marker, closes_at, visibility) on x.marker = p.content;

insert into public.community_poll_options (poll_id, option_text, sort_order)
select pl.id, 'opt-' || n, n
from public.community_polls pl
join public.community_posts p on p.id = pl.post_id
cross join generate_series(1, 2) as n
where p.content like 'rls-test-poll-%';

insert into public.community_comments (post_id, author_id, content)
select p.id, '00000000-0000-0000-0000-0000000000aa', 'rls-test-top-comment'
from public.community_posts p where p.content = 'rls-test-post-p2';

-- Posts: announcement gating ─────────────────────────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select throws_ok(
  $sql$insert into public.community_posts (community_id, author_id, post_type, content)
    values ((select id from public.communities where slug = 'kuet-cse-club'),
            '00000000-0000-0000-0000-0000000000aa', 'announcement', 'no power')$sql$,
  null,
  'plain members cannot create announcements'
);

reset role;

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select lives_ok(
  $sql$insert into public.community_posts (community_id, author_id, post_type, content)
    values ((select id from public.communities where slug = 'kuet-cse-club'),
            '00000000-0000-0000-0000-0000000000bb', 'announcement', 'rls-test-announcement')$sql$,
  'moderators can create announcements'
);

reset role;

-- Posts: soft deletion and removal rights ────────────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select lives_ok(
  $sql$update public.community_posts set status = 'removed'
    where content = 'rls-test-post-p1'$sql$,
  'authors can soft-delete their own posts'
);

reset role;

select is(
  (select status from public.community_posts where content = 'rls-test-post-p1'),
  'removed'::public.content_status,
  'soft delete keeps the row with status removed'
);

select test.act_as('00000000-0000-0000-0000-0000000000aa');

update public.community_posts set status = 'removed'
  where content = 'rls-test-announcement'; -- not authored by aa: 0 rows

select is(
  (select count(*) from public.community_posts
   where content = 'rls-test-announcement' and status = 'active'),
  1::bigint,
  'a member cannot remove another member''s post'
);

reset role;

-- Comments: one level of replies ─────────────────────────────────────────────

select lives_ok(
  $sql$insert into public.community_comments (post_id, author_id, content)
    select id, '00000000-0000-0000-0000-0000000000aa', 'rls-test-comment-2'
    from public.community_posts where content = 'rls-test-post-p2'$sql$,
  'members can comment on posts'
);

select lives_ok(
  $sql$insert into public.community_comments (post_id, author_id, parent_id, content)
    select c.post_id, '00000000-0000-0000-0000-0000000000aa', c.id, 'rls-test-reply'
    from public.community_comments c where c.content = 'rls-test-top-comment'$sql$,
  'members can reply to a top-level comment'
);

select throws_ok(
  $sql$insert into public.community_comments (post_id, author_id, parent_id, content)
    select c.post_id, '00000000-0000-0000-0000-0000000000aa', c.id, 'rls-test-nested'
    from public.community_comments c where c.content = 'rls-test-reply'$sql$,
  null,
  'replies-to-replies are rejected (one level only)'
);

reset role;

-- Moderation: lock and remove ────────────────────────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select lives_ok(
  $sql$update public.community_posts set is_locked = true
    where content = 'rls-test-post-p2'$sql$,
  'moderators can lock discussions'
);

select lives_ok(
  $sql$update public.community_posts set status = 'removed'
    where content = 'rls-test-post-p2'$sql$,
  'moderators can remove member posts'
);

reset role;

select is(
  (select status from public.community_posts where content = 'rls-test-post-p2'),
  'removed'::public.content_status,
  'moderator removal is a soft delete'
);

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select throws_ok(
  $sql$update public.community_posts set comment_count = 999
    where content = 'rls-test-poll-after-vote'$sql$,
  null,
  'authors cannot forge post counters'
);

select throws_ok(
  $sql$update public.community_posts set is_locked = true
    where content = 'rls-test-poll-after-vote'$sql$,
  null,
  'authors cannot lock their own discussion (moderator-only)'
);

reset role;

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select lives_ok(
  $sql$insert into public.community_pins (community_id, post_id, pinned_by)
    select p.community_id, p.id, '00000000-0000-0000-0000-0000000000bb'
    from public.community_posts p where p.content = 'rls-test-poll-after-vote'$sql$,
  'moderators can pin posts'
);

reset role;

select is(
  (select is_pinned from public.community_posts
   where content = 'rls-test-poll-after-vote'),
  true,
  'pinning a post flips its is_pinned flag'
);

-- Reactions ──────────────────────────────────────────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select lives_ok(
  $sql$insert into public.community_reactions (post_id, user_id)
    select id, '00000000-0000-0000-0000-0000000000aa'
    from public.community_posts where content = 'rls-test-poll-realtime'$sql$,
  'members can react to posts'
);

select throws_ok(
  $sql$insert into public.community_reactions (post_id, user_id)
    select id, '00000000-0000-0000-0000-0000000000aa'
    from public.community_posts where content = 'rls-test-poll-realtime'$sql$,
  null,
  'double reactions are rejected (one per user)'
);

reset role;

select is(
  (select reaction_count from public.community_posts
   where content = 'rls-test-poll-realtime'),
  1,
  'reaction_count follows the reactions table'
);

-- Polls: one vote, open window, result visibility ────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select lives_ok(
  $sql$insert into public.community_poll_votes (poll_id, option_id, user_id)
    select pl.id, (select id from public.community_poll_options o
                   where o.poll_id = pl.id order by sort_order limit 1),
           '00000000-0000-0000-0000-0000000000aa'
    from public.community_polls pl
    join public.community_posts p on p.id = pl.post_id
    where p.content = 'rls-test-poll-after-vote'$sql$,
  'members can vote once'
);

select throws_ok(
  $sql$insert into public.community_poll_votes (poll_id, option_id, user_id)
    select pl.id, (select id from public.community_poll_options o
                   where o.poll_id = pl.id order by sort_order desc limit 1),
           '00000000-0000-0000-0000-0000000000aa'
    from public.community_polls pl
    join public.community_posts p on p.id = pl.post_id
    where p.content = 'rls-test-poll-after-vote'$sql$,
  null,
  'a second vote in the same poll is rejected'
);

select throws_ok(
  $sql$insert into public.community_poll_votes (poll_id, option_id, user_id)
    select pl.id, (select id from public.community_poll_options o
                   where o.poll_id = pl.id order by sort_order limit 1),
           '00000000-0000-0000-0000-0000000000aa'
    from public.community_polls pl
    join public.community_posts p on p.id = pl.post_id
    where p.content = 'rls-test-poll-closed'$sql$,
  null,
  'voting on a closed poll is rejected'
);

select lives_ok(
  $sql$insert into public.community_poll_votes (poll_id, option_id, user_id)
    select pl.id, (select id from public.community_poll_options o
                   where o.poll_id = pl.id order by sort_order limit 1),
           '00000000-0000-0000-0000-0000000000aa'
    from public.community_polls pl
    join public.community_posts p on p.id = pl.post_id
    where p.content = 'rls-test-poll-realtime'$sql$,
  'members can vote in a realtime poll'
);

reset role;

select test.act_as('00000000-0000-0000-0000-0000000000cc');

select throws_ok(
  $sql$insert into public.community_poll_votes (poll_id, option_id, user_id)
    select pl.id, (select id from public.community_poll_options o
                   where o.poll_id = pl.id order by sort_order limit 1),
           '00000000-0000-0000-0000-0000000000cc'
    from public.community_polls pl
    join public.community_posts p on p.id = pl.post_id
    where p.content = 'rls-test-poll-after-vote'$sql$,
  null,
  'non-members cannot vote'
);

select is(
  (select count(*) from public.community_poll_votes v
   join public.community_polls pl on pl.id = v.poll_id
   join public.community_posts p on p.id = pl.post_id
   where p.content = 'rls-test-poll-after-vote'),
  0::bigint,
  'after_vote results stay hidden from members who have not voted'
);

select is(
  (select count(*) from public.community_poll_votes v
   join public.community_polls pl on pl.id = v.poll_id
   join public.community_posts p on p.id = pl.post_id
   where p.content = 'rls-test-poll-realtime'),
  1::bigint,
  'realtime results are visible to everyone'
);

reset role;

-- Events ─────────────────────────────────────────────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select throws_ok(
  $sql$insert into public.community_events (community_id, title, starts_at, created_by)
    values ((select id from public.communities where slug = 'kuet-cse-club'),
            'rls-test-event', now() + interval '3 days',
            '00000000-0000-0000-0000-0000000000aa')$sql$,
  null,
  'plain members cannot create community events'
);

reset role;

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select lives_ok(
  $sql$insert into public.community_events (community_id, title, starts_at, created_by)
    values ((select id from public.communities where slug = 'kuet-cse-club'),
            'rls-test-event', now() + interval '3 days',
            '00000000-0000-0000-0000-0000000000bb')$sql$,
  'moderators can create community events'
);

reset role;

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select lives_ok(
  $sql$insert into public.community_event_attendees (event_id, user_id, rsvp)
    select id, '00000000-0000-0000-0000-0000000000aa', 'attending'
    from public.community_events where title = 'rls-test-event'$sql$,
  'members can RSVP to community events'
);

reset role;

select test.act_as('00000000-0000-0000-0000-0000000000cc');

select throws_ok(
  $sql$insert into public.community_event_attendees (event_id, user_id, rsvp)
    select id, '00000000-0000-0000-0000-0000000000cc', 'attending'
    from public.community_events where title = 'rls-test-event'$sql$,
  null,
  'non-members cannot RSVP'
);

reset role;

-- Creation requests: student submits, admin decides ─────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000aa');

select lives_ok(
  $sql$insert into public.community_requests
    (requested_by, name, category_id, description)
  values ('00000000-0000-0000-0000-0000000000aa', 'rls-test-request',
          (select id from public.community_categories where slug = 'interest'),
          'A test community created by the RLS suite.')$sql$,
  'students can submit community requests'
);

select is(
  (select count(*) from public.community_requests),
  1::bigint,
  'students see only their own requests (seeded one belongs to another user)'
);

update public.community_requests set status = 'approved'
  where name = 'rls-test-request'; -- no UPDATE policy: 0 rows

select is(
  (select status from public.community_requests where name = 'rls-test-request'),
  'pending'::public.community_request_status,
  'students cannot approve their own request'
);

reset role;

-- Member management ──────────────────────────────────────────────────────────

select test.act_as('00000000-0000-0000-0000-0000000000bb');

select lives_ok(
  $sql$delete from public.community_members
    where community_id = (select id from public.communities where slug = 'kuet-cse-club')
      and user_id = '00000000-0000-0000-0000-0000000000aa'$sql$,
  'moderators can remove plain members'
);

select is(
  (select count(*) from public.community_members
   where community_id = (select id from public.communities where slug = 'kuet-cse-club')
     and user_id = '00000000-0000-0000-0000-0000000000aa'),
  0::bigint,
  'removed member is gone from the community'
);

delete from public.community_members
  where community_id = (select id from public.communities where slug = 'kuet-cse-club')
    and user_id = '22222222-2222-2222-2222-222222222201'
    and role = 'owner'; -- owner row is not deletable by moderators: 0 rows

select is(
  (select count(*) from public.community_members
   where community_id = (select id from public.communities where slug = 'kuet-cse-club')
     and user_id = '22222222-2222-2222-2222-222222222201'
     and role = 'owner'),
  1::bigint,
  'moderators cannot remove the community owner'
);

reset role;

select finish();
rollback;
