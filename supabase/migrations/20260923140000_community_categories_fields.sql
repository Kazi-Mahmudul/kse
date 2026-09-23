-- Community redesign (2/9): categories, community fields, rules,
-- trigger-maintained member_count.
--
-- Moderators stay in community_members.role (member|moderator|owner) —
-- a separate community_moderators table would duplicate that model.

-- ── Category master data ─────────────────────────────────────────────────────

create table if not exists public.community_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.community_categories
for each row execute function public.set_updated_at();

alter table public.community_categories enable row level security;

create policy community_categories_select_public on public.community_categories
  for select to anon, authenticated using (true);
-- writes are service-role only (admin panel)

insert into public.community_categories (name, slug, sort_order) values
  ('University', 'university', 1),
  ('Department', 'department', 2),
  ('Career', 'career', 3),
  ('Skills', 'skills', 4),
  ('Interest', 'interest', 5)
on conflict (name) do nothing;

-- ── New community fields ─────────────────────────────────────────────────────

alter table public.communities
  add column if not exists category_id uuid
    references public.community_categories(id) on delete set null,
  add column if not exists department_id uuid
    references public.departments(id) on delete set null,
  add column if not exists member_count integer not null default 0;

create index if not exists communities_category_idx on public.communities (category_id);
create index if not exists communities_department_idx on public.communities (department_id);
-- communities_university_idx already exists

-- member_count is derived: recomputed by trigger so users can never set it.
create or replace function public.sync_community_member_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_community uuid := coalesce(new.community_id, old.community_id);
begin
  update public.communities c
    set member_count = (
      select count(*) from public.community_members m
      where m.community_id = v_community)
    where c.id = v_community;
  return null;
end $$;

drop trigger if exists sync_community_member_count on public.community_members;
create trigger sync_community_member_count
  after insert or delete or update of community_id on public.community_members
  for each row execute function public.sync_community_member_count();

update public.communities c
  set member_count = (
    select count(*) from public.community_members m
    where m.community_id = c.id)
  where c.member_count = 0;

-- ── Rules ────────────────────────────────────────────────────────────────────

create table if not exists public.community_rules (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists community_rules_community_idx
  on public.community_rules (community_id, sort_order);

alter table public.community_rules enable row level security;

create policy community_rules_select on public.community_rules
  for select to anon, authenticated using (
    exists (
      select 1 from public.communities c
      where c.id = community_rules.community_id
        and (c.status = 'active' or public.is_staff())
    )
  );
-- writes are service-role only (admin panel / approval flow)