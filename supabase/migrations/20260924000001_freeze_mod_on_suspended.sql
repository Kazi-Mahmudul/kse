-- Layer 2a — archived/suspended communities freeze moderator actions.
-- Each moderator policy now uses can_moderate_community(cid), which combines
-- is_community_announcer(cid) with a status='active' check on the community.
-- Also tightens the leaky 'using (true)' policies on community_poll_options
-- and community_event_attendees (audit finding S7).

-- ── community_pins ────────────────────────────────────────────────────────────

drop policy if exists community_pins_insert_announcer on public.community_pins;
create policy community_pins_insert_announcer on public.community_pins
  for insert to authenticated with check (
    pinned_by = auth.uid()
    and public.can_moderate_community(community_pins.community_id)
    and exists (
      select 1 from public.community_posts p
      where p.id = community_pins.post_id
        and p.community_id = community_pins.community_id
        and p.status = 'active'
    )
  );

drop policy if exists community_pins_delete_announcer on public.community_pins;
create policy community_pins_delete_announcer on public.community_pins
  for delete to authenticated using (
    public.can_moderate_community(community_pins.community_id)
  );

-- ── community_posts (moderator update policy) ────────────────────────────────

drop policy if exists community_posts_update_moderator on public.community_posts;
create policy community_posts_update_moderator on public.community_posts
  for update to authenticated using (
    public.can_moderate_community(community_posts.community_id)
  ) with check (
    public.can_moderate_community(community_posts.community_id)
    and status in ('active', 'hidden', 'removed')
  );

-- Announcement insert check: a mod can announce, but only when the
-- community itself is still active (otherwise frozen).
drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own on public.community_posts
  for insert to authenticated with check (
    author_id = auth.uid()
    and status = 'active'
    and public.is_community_member(community_posts.community_id)
    and public.community_status_active(community_posts.community_id)
    and (
      post_type <> 'announcement'
      or public.can_moderate_community(community_posts.community_id)
    )
  );

-- ── community_comments (moderator update + visibility) ───────────────────────

drop policy if exists community_comments_update_moderator on public.community_comments;
create policy community_comments_update_moderator on public.community_comments
  for update to authenticated using (
    exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id
        and public.can_moderate_community(p.community_id)
    )
  ) with check (
    exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id
        and public.can_moderate_community(p.community_id)
    )
    and status in ('active', 'hidden', 'removed')
  );

drop policy if exists community_comments_select on public.community_comments;
create policy community_comments_select on public.community_comments
  for select to authenticated using (
    exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id
        and p.status = 'active'
        and (public.is_staff() or exists (
          select 1 from public.communities c
          where c.id = p.community_id and c.status = 'active'))
    )
    and (
      status = 'active'
      or (
        status in ('hidden', 'removed')
        and (
          author_id = auth.uid()
          or exists (
            select 1 from public.community_posts p2
            where p2.id = community_comments.post_id
              and public.can_moderate_community(p2.community_id)
          )
          or public.is_staff()
        )
      )
    )
  );

-- ── community_events ─────────────────────────────────────────────────────────

drop policy if exists community_events_insert_announcer on public.community_events;
create policy community_events_insert_announcer on public.community_events
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.can_moderate_community(community_events.community_id)
  );

drop policy if exists community_events_update_announcer on public.community_events;
create policy community_events_update_announcer on public.community_events
  for update to authenticated using (
    public.can_moderate_community(community_events.community_id)
  ) with check (
    public.can_moderate_community(community_events.community_id)
  );

-- Visibility widens the hidden/removed path only for can_moderate, not just
-- is_community_announcer — same intent as posts/comments.
drop policy if exists community_events_select on public.community_events;
create policy community_events_select on public.community_events
  for select to authenticated using (
    (
      status = 'active'
      or public.can_moderate_community(community_events.community_id)
      or public.is_staff()
    )
    and exists (
      select 1 from public.communities c
      where c.id = community_events.community_id and c.status = 'active'
    )
  );

-- RSVP insert: only members of active communities (Layer 2a).
drop policy if exists community_event_attendees_insert_own on public.community_event_attendees;
create policy community_event_attendees_insert_own on public.community_event_attendees
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.community_events e
      join public.communities c on c.id = e.community_id
      where e.id = community_event_attendees.event_id
        and e.status = 'active'
        and c.status = 'active'
        and public.is_community_member(e.community_id)
    )
  );

-- RSVP / poll-options visibility now joins to the parent community.
drop policy if exists community_event_attendees_select on public.community_event_attendees;
create policy community_event_attendees_select on public.community_event_attendees
  for select to authenticated using (
    public.is_staff()
    or exists (
      select 1 from public.community_events e
      join public.communities c on c.id = e.community_id
      where e.id = community_event_attendees.event_id
        and c.status = 'active'
        and e.status = 'active'
    )
  );

drop policy if exists community_poll_options_select on public.community_poll_options;
create policy community_poll_options_select on public.community_poll_options
  for select to authenticated using (
    public.is_staff()
    or exists (
      select 1 from public.community_polls p
      join public.community_posts pp on pp.id = p.post_id
      join public.communities c on c.id = pp.community_id
      where p.id = community_poll_options.poll_id
        and c.status = 'active'
        and pp.status = 'active'
    )
  );

-- ── community_members delete (mod removal of members) ────────────────────────

drop policy if exists community_members_delete_own on public.community_members;
create policy community_members_delete_own on public.community_members
  for delete to authenticated using (
    (user_id = auth.uid() and community_members.role in ('member', 'moderator'))
    or (
      public.can_moderate_community(community_members.community_id)
      and community_members.role = 'member'
    )
  );
