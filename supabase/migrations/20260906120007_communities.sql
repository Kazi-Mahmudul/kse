-- Communities (spec §6 "Community"): list, membership, announcements and
-- basic posts. Deliberately not a full social network (spec §31 "Later").

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  university_id uuid references public.universities(id) on delete set null,
  cover_image_url text,
  created_by uuid references auth.users(id) on delete set null,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.community_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  is_announcement boolean not null default false,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.communities
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.community_posts
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;

create policy communities_select_active on public.communities
  for select to anon, authenticated
  using (status = 'active' or public.is_staff());

-- Membership self-service: join and leave.
create policy community_members_select on public.community_members
  for select to authenticated
  using (true);

create policy community_members_insert_own on public.community_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'member'
    and exists (
      select 1 from public.communities c
      where c.id = community_id and c.status = 'active'
    )
  );

create policy community_members_delete_own on public.community_members
  for delete to authenticated
  using (user_id = auth.uid() and role = 'member');

-- Posts are readable inside active communities.
create policy community_posts_select on public.community_posts
  for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.communities c
      where c.id = community_id and c.status = 'active'
    )
  );

-- Members may post; announcements require moderator/owner.
create policy community_posts_insert_own on public.community_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'active'
    and exists (
      select 1 from public.community_members m
      where m.community_id = community_id
        and m.user_id = auth.uid()
        and (not is_announcement or m.role in ('moderator', 'owner'))
    )
  );

create policy community_posts_update_own on public.community_posts
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and status = 'active');

-- Authors and community moderators may remove posts.
create policy community_posts_delete_own on public.community_posts
  for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.community_members m
      where m.community_id = community_id
        and m.user_id = auth.uid()
        and m.role in ('moderator', 'owner')
    )
  );

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index communities_university_idx on public.communities (university_id);
create index communities_slug_idx on public.communities (slug);
create index community_members_user_idx on public.community_members (user_id);
create index community_posts_community_idx on public.community_posts (community_id, created_at desc);
create index community_posts_author_idx on public.community_posts (author_id);
