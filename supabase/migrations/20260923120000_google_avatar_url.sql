-- Google sign-in: Supabase stores the Google profile photo in
-- raw_user_meta_data.avatar_url, but handle_new_user only copied full_name —
-- so Google users rendered with initials instead of their picture.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
             nullif(new.raw_user_meta_data ->> 'name', '')),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- Backfill profiles created before this change (e.g. existing Google users);
-- never overwrites an avatar the user uploaded themselves.
update public.profiles p
set avatar_url = u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
where p.id = u.id
  and p.avatar_url is null
  and coalesce(u.raw_user_meta_data ->> 'avatar_url', '') <> '';
