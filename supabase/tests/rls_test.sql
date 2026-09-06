-- RLS regression tests (spec §29 "RLS permissions").
-- pgTAP run via `supabase db test`.
--
-- Supabase RLS reads auth.uid() from request.jwt.claims, so impersonation
-- sets that config with the user's UUID and assumes the `authenticated` role.

begin;
-- pgTAP is not part of any migration; install it per-run so `db test` is
-- self-contained after `db reset` (extension installs don't survive resets).
create extension if not exists pgtap with schema extensions;
select plan(19);

-- ── Fixtures (created as postgres, which bypasses RLS) ─────────────────────

-- The handle_new_user trigger already inserts bare profiles for these rows,
-- so upsert the friendly names instead of plain-inserting (would duplicate).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000aa', 'a@test.kse'),
  ('00000000-0000-0000-0000-0000000000bb', 'b@test.kse');

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
  6::bigint,
  'authenticated users see only the 6 seeded published opportunities, not drafts'
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
  1::bigint,
  'search_vector finds the React internship'
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

select finish();
rollback;
