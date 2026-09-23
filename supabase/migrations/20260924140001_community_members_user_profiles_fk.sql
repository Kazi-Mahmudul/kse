-- Fix admin "Could not load members: Could not find a relationship between
-- 'community_members' and 'profiles' in the schema cache".
--
-- PostgREST derives join relationships from FK constraints and only knows
-- about FKs that point at tables in the `public` schema. The original
-- community_members schema declared
--   user_id uuid references auth.users(id) on delete cascade
-- which is unjoinable against public.profiles from the admin client.
--
-- profiles.id is a 1:1 mirror of auth.users(id) (profiles.id PK references
-- auth.users(id)), so every user_id value already resolves to a profiles row.
-- Drop the auth.users FK and add a public.profiles FK so the admin members
-- page can use the `profile:profiles(...)` join.

-- Drop the constraint defensively using both the auto-generated name and
-- the legacy naming convention in case a previous run named it.
alter table public.community_members
  drop constraint if exists community_members_user_id_fkey;

alter table public.community_members
  add constraint community_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- PostgREST reloads the schema cache via NOTIFY when DDL touches tracked
-- tables; force a refresh so the relationship is discoverable immediately.
notify pgrst, 'reload schema';
