-- ── Mentor Applications, Discussion Interactions & Chat Improvements ────────────
-- 1. mentor_applications — students apply to become a mentor
-- 2. mentor_discussion_likes — per-user likes on mentor_discussions
-- 3. mentor_discussion_comments — student/mentor comments on discussions
-- 4. mentor_messages bidirectional — allow mentor to read/send in their thread
-- 5. Notifications for mentor chat messages
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Mentor Applications
create table if not exists public.mentor_applications (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  full_name       text        not null,
  email           text        not null,
  phone           text,
  organization    text        not null,
  designation     text        not null,
  experience_years smallint   not null default 1,
  education       text        not null,
  expertise_areas text[]      not null default '{}',
  bio             text        not null,
  linkedin_url    text,
  session_mode    text        not null default 'online'
                    check (session_mode in ('online', 'offline', 'hybrid')),
  status          text        not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  admin_note      text,
  opportunity_id  uuid        references public.opportunities(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists mentor_applications_user_idx
  on public.mentor_applications (user_id, created_at desc);

create index if not exists mentor_applications_status_idx
  on public.mentor_applications (status, created_at desc);

alter table public.mentor_applications enable row level security;

create policy mentor_applications_select on public.mentor_applications
  for select to authenticated
  using (user_id = auth.uid());

create policy mentor_applications_insert on public.mentor_applications
  for insert to authenticated
  with check (user_id = auth.uid());

create policy mentor_applications_update on public.mentor_applications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Staff can read and update all applications
create policy mentor_applications_staff_select on public.mentor_applications
  for select to authenticated
  using (public.is_staff());

create policy mentor_applications_staff_update on public.mentor_applications
  for update to authenticated
  using (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Discussion Likes (per user, per discussion)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.mentor_discussion_likes (
  discussion_id   uuid        not null references public.mentor_discussions(id) on delete cascade,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (discussion_id, user_id)
);

alter table public.mentor_discussion_likes enable row level security;

create policy mentor_discussion_likes_select on public.mentor_discussion_likes
  for select to authenticated using (true);

create policy mentor_discussion_likes_insert on public.mentor_discussion_likes
  for insert to authenticated
  with check (user_id = auth.uid());

create policy mentor_discussion_likes_delete on public.mentor_discussion_likes
  for delete to authenticated
  using (user_id = auth.uid());

-- Trigger to keep likes_count in sync
create or replace function public.sync_discussion_likes_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.mentor_discussions
    set likes_count = likes_count + 1
    where id = NEW.discussion_id;
  elsif TG_OP = 'DELETE' then
    update public.mentor_discussions
    set likes_count = greatest(0, likes_count - 1)
    where id = OLD.discussion_id;
  end if;
  return null;
end;
$$;

create trigger sync_discussion_likes_count_trigger
after insert or delete on public.mentor_discussion_likes
for each row execute function public.sync_discussion_likes_count();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Discussion Comments
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.mentor_discussion_comments (
  id              uuid        primary key default gen_random_uuid(),
  discussion_id   uuid        not null references public.mentor_discussions(id) on delete cascade,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  content         text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint mentor_discussion_comments_length_check
    check (char_length(trim(content)) > 0 and char_length(content) <= 1000)
);

create index if not exists mentor_discussion_comments_discussion_idx
  on public.mentor_discussion_comments (discussion_id, created_at asc);

alter table public.mentor_discussion_comments enable row level security;

create policy mentor_discussion_comments_select on public.mentor_discussion_comments
  for select to authenticated using (true);

create policy mentor_discussion_comments_insert on public.mentor_discussion_comments
  for insert to authenticated
  with check (user_id = auth.uid());

create policy mentor_discussion_comments_delete on public.mentor_discussion_comments
  for delete to authenticated
  using (user_id = auth.uid());

-- Trigger to keep comments_count in sync
create or replace function public.sync_discussion_comments_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.mentor_discussions
    set comments_count = comments_count + 1
    where id = NEW.discussion_id;
  elsif TG_OP = 'DELETE' then
    update public.mentor_discussions
    set comments_count = greatest(0, comments_count - 1)
    where id = OLD.discussion_id;
  end if;
  return null;
end;
$$;

create trigger sync_discussion_comments_count_trigger
after insert or delete on public.mentor_discussion_comments
for each row execute function public.sync_discussion_comments_count();

-- Enable realtime for comments
alter publication supabase_realtime add table public.mentor_discussion_comments;
alter publication supabase_realtime add table public.mentor_discussion_likes;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Allow mentor (opportunity owner) to read/send in their own thread
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old strict select policy (students only see their own messages)
drop policy if exists mentor_messages_select on public.mentor_messages;

-- New bidirectional: sender sees own messages OR user is the opportunity "mentor" (via mentor_applications)
create policy mentor_messages_select on public.mentor_messages
  for select to authenticated
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.mentor_applications ma
      where ma.opportunity_id = mentor_messages.opportunity_id
        and ma.user_id = auth.uid()
        and ma.status = 'approved'
    )
    or public.is_staff()
  );

-- Mentors can also send into their opportunity thread
drop policy if exists mentor_messages_insert on public.mentor_messages;

create policy mentor_messages_insert on public.mentor_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      -- Student sending to a published mentor thread
      exists (
        select 1 from public.opportunities o
        where o.id = opportunity_id
          and o.type = 'mentorship'
          and o.status = 'published'
      )
      -- OR approved mentor responding in their own thread
      or exists (
        select 1 from public.mentor_applications ma
        where ma.opportunity_id = mentor_messages.opportunity_id
          and ma.user_id = auth.uid()
          and ma.status = 'approved'
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Add notification types for mentor chat and applications
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_type where typname = 'notification_type') then
    -- Add new enum values safely
    begin
      alter type public.notification_type add value if not exists 'mentor_message';
    exception when others then null;
    end;
    begin
      alter type public.notification_type add value if not exists 'mentor_application_status';
    exception when others then null;
    end;
    begin
      alter type public.notification_type add value if not exists 'mentor_application_received';
    exception when others then null;
    end;
    begin
      alter type public.notification_type add value if not exists 'mentor_session_booked';
    exception when others then null;
    end;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Function to send notification when a mentor_message is inserted
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.notify_mentor_message()
returns trigger language plpgsql security definer as $$
declare
  v_opportunity_title text;
  v_sender_name text;
  v_recipient_id uuid;
begin
  -- Get opportunity title
  select title into v_opportunity_title
  from public.opportunities
  where id = NEW.opportunity_id;

  -- Get sender's name
  select coalesce(full_name, email) into v_sender_name
  from public.profiles
  where id = NEW.sender_id;

  -- Notify the other party in the conversation
  -- If sender is a student, notify the approved mentor for this opportunity
  -- If sender is the mentor, notify all students who sent messages in this thread
  if exists (
    select 1 from public.mentor_applications ma
    where ma.opportunity_id = NEW.opportunity_id
      and ma.user_id = NEW.sender_id
      and ma.status = 'approved'
  ) then
    -- Sender is the mentor — notify each unique student who messaged in this thread
    for v_recipient_id in
      select distinct sender_id from public.mentor_messages
      where opportunity_id = NEW.opportunity_id
        and sender_id != NEW.sender_id
    loop
      insert into public.notifications (user_id, type, title, body, data)
      values (
        v_recipient_id,
        'mentor_message',
        coalesce(v_sender_name, 'Your Mentor'),
        'New message from your mentor: ' || coalesce(v_opportunity_title, 'Mentor'),
        jsonb_build_object(
          'opportunity_id', NEW.opportunity_id,
          'message_id', NEW.id
        )
      )
      on conflict do nothing;
    end loop;
  else
    -- Sender is a student — notify the approved mentor if exists
    select ma.user_id into v_recipient_id
    from public.mentor_applications ma
    where ma.opportunity_id = NEW.opportunity_id
      and ma.status = 'approved'
    limit 1;

    if v_recipient_id is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        v_recipient_id,
        'mentor_message',
        coalesce(v_sender_name, 'A student'),
        'New message about: ' || coalesce(v_opportunity_title, 'your mentorship'),
        jsonb_build_object(
          'opportunity_id', NEW.opportunity_id,
          'message_id', NEW.id
        )
      )
      on conflict do nothing;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger notify_mentor_message_trigger
after insert on public.mentor_messages
for each row execute function public.notify_mentor_message();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. mentor_message_attachments — optional file/image uploads in chat
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.mentor_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text; -- 'image' | 'file'
