-- Portfolio links (spec §6 "Profile" — links). Same owner-only RLS shape
-- as the rest of the portfolio tables.

create table public.user_portfolio_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.user_portfolio_links
  for each row execute function public.set_updated_at();

alter table public.user_portfolio_links enable row level security;

-- Public on the student's profile: MVP makes authenticated reads visible.
-- (A future revision can narrow to "only verified connections" once the
-- connections feature lands.)
create policy user_portfolio_links_select_authenticated
  on public.user_portfolio_links
  for select to authenticated
  using (true);

create policy user_portfolio_links_insert_own
  on public.user_portfolio_links
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_portfolio_links_update_own
  on public.user_portfolio_links
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_portfolio_links_delete_own
  on public.user_portfolio_links
  for delete to authenticated
  using (user_id = auth.uid());

create index user_portfolio_links_user_idx
  on public.user_portfolio_links (user_id, position);
