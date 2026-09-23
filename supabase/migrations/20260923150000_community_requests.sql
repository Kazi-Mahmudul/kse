-- Community redesign (3/9): community creation requests.
-- Students request → admin reviews → approval creates a public community.

create type public.community_request_status as enum ('pending', 'approved', 'rejected');

create table public.community_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 80),
  category_id uuid references public.community_categories(id) on delete set null,
  description text not null check (char_length(description) between 10 and 1000),
  purpose text check (char_length(purpose) between 10 and 500),
  university_id uuid references public.universities(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  proposed_rules jsonb not null default '[]'::jsonb,
  image_url text,
  status public.community_request_status not null default 'pending',
  community_id uuid references public.communities(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.community_requests
for each row execute function public.set_updated_at();

create index community_requests_status_idx
  on public.community_requests (status, created_at desc);
create index community_requests_requester_idx
  on public.community_requests (requested_by, created_at desc);
create index community_requests_category_idx on public.community_requests (category_id);
create index community_requests_university_idx on public.community_requests (university_id);

alter table public.community_requests enable row level security;

-- Students see and create only their own requests; admins see all and
-- decide via the admin panel (service-role client).
create policy community_requests_select_own on public.community_requests
  for select to authenticated using (
    requested_by = auth.uid() or public.is_staff()
  );

create policy community_requests_insert_own on public.community_requests
  for insert to authenticated with check (
    requested_by = auth.uid() and status = 'pending'
  );
