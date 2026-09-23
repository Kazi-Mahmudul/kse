-- Auto-fill user_followed_topics.user_id with auth.uid() on insert so the
-- client doesn't have to send it (mobile calls `insert({ topic })`).
--
-- The 403 the client hits is RLS rejecting the insert because user_id is
-- null: the WITH CHECK `user_id = auth.uid()` is false when the column
-- is null. Defaulting the column makes new rows carry the caller's uid
-- before the policy is evaluated.

create or replace function public.user_followed_topics_set_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists user_followed_topics_set_user_id_trg
  on public.user_followed_topics;

create trigger user_followed_topics_set_user_id_trg
  before insert on public.user_followed_topics
  for each row execute function public.user_followed_topics_set_user_id();

notify pgrst, 'reload schema';
