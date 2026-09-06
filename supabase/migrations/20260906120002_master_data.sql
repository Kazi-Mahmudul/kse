-- Master data (spec §7 "Master Data"). Read-only for mobile clients;
-- managed by admins through the service-role client.

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- Optional scoping: when set, the category only applies to this type.
  opportunity_type public.opportunity_type,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at maintenance
do $$
declare t text;
begin
  foreach t in array array['universities', 'departments', 'subjects', 'skills',
                           'opportunity_categories', 'tags']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.universities enable row level security;
alter table public.departments enable row level security;
alter table public.subjects enable row level security;
alter table public.skills enable row level security;
alter table public.opportunity_categories enable row level security;
alter table public.tags enable row level security;

-- Public reference data: readable by everyone, writable only via service role.
do $$
declare t text;
begin
  foreach t in array array['universities', 'departments', 'subjects', 'skills',
                           'opportunity_categories', 'tags']
  loop
    execute format('create policy %I on public.%I
                    for select to anon, authenticated
                    using (true)', t || '_select_public', t);
  end loop;
end $$;

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index departments_university_id_idx on public.departments (university_id);
