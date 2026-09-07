-- Push tokens (spec §18): the Expo push token per user/device. Captured by
-- the mobile app on first launch once a development build is in use; the
-- delivery pipeline (Edge Function) reads this when sending push channel.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  -- "expo" | "fcm" | "apns" — service layer treats expo for now.
  provider text not null default 'expo',
  -- Last seen from any registration call; lets the Edge Function GC stale tokens.
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Users see their own tokens (and update last_seen via trigger / RLS).
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated
  using (user_id = auth.uid());

-- Users register only their own tokens; idempotent upsert on (user_id, token).
create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated
  with check (user_id = auth.uid());

-- Users can update last_seen on their own rows (used by heartbeat from app).
create policy push_tokens_update_own on public.push_tokens
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can unregister their own tokens (e.g. sign-out).
create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated
  using (user_id = auth.uid());
