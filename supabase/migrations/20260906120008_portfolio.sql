-- Student portfolio (spec §6 "Profile"): skills, projects, certificates,
-- achievements, research, resumes. All owner-only.

create table public.user_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  level text, -- e.g. beginner / intermediate / advanced (app-validated)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table public.user_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  url text,
  tech_stack text[] not null default '{}',
  started_on date,
  completed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  issuer text,
  issued_on date,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  achieved_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_research (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  abstract text,
  role text,
  collaborators text[] not null default '{}',
  url text,
  published_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Triggers + RLS: identical own-CRUD shape for every table ────────────────

do $$
declare t text;
begin
  foreach t in array array['user_skills', 'user_projects', 'user_certificates',
                           'user_achievements', 'user_research', 'user_resumes']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);

    execute format('alter table public.%I enable row level security', t);

    -- Portfolio items are visible on student profiles (MVP: authenticated).
    execute format('create policy %I on public.%I for select to authenticated
                    using (true)', t || '_select_authenticated', t);

    execute format('create policy %I on public.%I for insert to authenticated
                    with check (user_id = auth.uid())', t || '_insert_own', t);

    execute format('create policy %I on public.%I for update to authenticated
                    using (user_id = auth.uid())
                    with check (user_id = auth.uid())', t || '_update_own', t);

    execute format('create policy %I on public.%I for delete to authenticated
                    using (user_id = auth.uid())', t || '_delete_own', t);
  end loop;
end $$;

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index user_skills_skill_idx on public.user_skills (skill_id);
create index user_projects_user_idx on public.user_projects (user_id);
create index user_certificates_user_idx on public.user_certificates (user_id);
create index user_achievements_user_idx on public.user_achievements (user_id);
create index user_research_user_idx on public.user_research (user_id);
create index user_resumes_user_idx on public.user_resumes (user_id);
