-- Community redesign (6/9): polls.
-- A poll is a community_posts row with post_type = 'poll'; the question lives
-- in post.content so polls flow through the same feed, pins and reports.

create table public.community_polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.community_posts(id) on delete cascade,
  closes_at timestamptz,
  result_visibility text not null default 'after_close'
    check (result_visibility in ('realtime', 'after_vote', 'after_close')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.community_polls
for each row execute function public.set_updated_at();

create index community_polls_open_idx on public.community_polls (closes_at)
  where closes_at is not null;

create table public.community_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.community_polls(id) on delete cascade,
  option_text text not null check (char_length(option_text) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index community_poll_options_poll_idx
  on public.community_poll_options (poll_id, sort_order);

create table public.community_poll_votes (
  poll_id uuid not null references public.community_polls(id) on delete cascade,
  option_id uuid not null references public.community_poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create index community_poll_votes_option_idx on public.community_poll_votes (option_id);
create index community_poll_votes_user_idx on public.community_poll_votes (user_id);

alter table public.community_polls enable row level security;
alter table public.community_poll_options enable row level security;
alter table public.community_poll_votes enable row level security;

-- Polls and their options are readable like any post content.
create policy community_polls_select on public.community_polls
  for select to authenticated using (
    public.is_staff() or exists (
      select 1 from public.community_posts p
      where p.id = community_polls.post_id
        and p.status = 'active'
        and exists (
          select 1 from public.communities c
          where c.id = p.community_id and c.status = 'active')
    )
  );

create policy community_poll_options_select on public.community_poll_options
  for select to authenticated using (true);

-- Creation happens in the same transaction as the poll post (mobile app /
-- edge function, under the caller's JWT so RLS applies here too).
create policy community_polls_insert_member on public.community_polls
  for insert to authenticated with check (
    exists (
      select 1 from public.community_posts p
      where p.id = community_polls.post_id
        and p.post_type = 'poll'
        and p.status = 'active'
        and public.is_community_member(p.community_id)
    )
  );

create policy community_poll_options_insert_member on public.community_poll_options
  for insert to authenticated with check (
    exists (
      select 1 from public.community_polls p
      join public.community_posts pp on pp.id = p.post_id
      where p.id = community_poll_options.poll_id
        and pp.status = 'active'
        and public.is_community_member(pp.community_id)
    )
  );

-- Votes: one per user per poll (PK), members only, only while the poll is
-- open. No update/delete policies — votes are immutable for the MVP.
create policy community_poll_votes_insert_own on public.community_poll_votes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.community_poll_options o
      where o.id = community_poll_votes.option_id
        and o.poll_id = community_poll_votes.poll_id
    )
    and exists (
      select 1 from public.community_polls p
      join public.community_posts pp on pp.id = p.post_id
      where p.id = community_poll_votes.poll_id
        and pp.status = 'active'
        and (p.closes_at is null or p.closes_at > now())
        and public.is_community_member(pp.community_id)
    )
  );

-- Result visibility is enforced on read:
--   realtime    → always
--   after_vote  → once the viewer has voted
--   after_close → once the poll has closed
-- A viewer's own vote is always visible to them.
-- "Has the viewer voted" cannot be asked inside this policy (the policy is
-- evaluated while reading this very table → infinite recursion), so it goes
-- through a security-definer helper.
create or replace function public.has_voted_on_poll(p_poll_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.community_poll_votes v
    where v.poll_id = p_poll_id and v.user_id = auth.uid()
  );
$$;

create policy community_poll_votes_select_visible on public.community_poll_votes
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from public.community_polls p
      join public.community_posts pp on pp.id = p.post_id
      where p.id = community_poll_votes.poll_id
        and (
          p.result_visibility = 'realtime'
          or (p.closes_at is not null and p.closes_at < now())
          or (p.result_visibility = 'after_vote' and public.has_voted_on_poll(p.id))
        )
    )
  );
