-- Profiles (1:1 with auth.users) and role assignments (spec §5).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  university_id uuid references public.universities(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  academic_level public.academic_level,
  bio text,
  interests text[] not null default '{}',
  phone text,
  is_verified boolean not null default false,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- updated_at maintenance
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Block students from self-promoting protected columns. Admin changes go
-- through the service-role client, which bypasses RLS and this trigger.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.is_verified is distinct from old.is_verified
       or new.status is distinct from old.status then
      raise exception 'Profiles: is_verified/status may not be changed by the owner';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Role checks used inside RLS policies. Security definer so policies on
-- user-owned tables can read user_roles without recursive RLS.
create or replace function public.has_role(_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = _role
  );
$$;

-- Content managers and above.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('content_manager')
      or public.has_role('admin')
      or public.has_role('super_admin');
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- MVP: authenticated users can browse other students (student ecosystem).
-- Column-level tightening for sensitive fields is planned for the security
-- review step (spec §34, roadmap step 20).
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No client INSERT/DELETE: rows are created by the auth trigger (step 3)
-- and removed with the auth.users row.

-- Roles: readable by the owner and staff; mutated only via service role.
create policy user_roles_select_own on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index profiles_university_id_idx on public.profiles (university_id);
create index profiles_department_id_idx on public.profiles (department_id);
create index user_roles_user_id_idx on public.user_roles (user_id);
