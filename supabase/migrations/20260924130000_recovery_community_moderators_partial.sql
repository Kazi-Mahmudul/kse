-- Recovery for the half-applied 20260924000000. The first push created
-- community_moderators + indexes + RLS but failed on the backfill insert
-- twice: (1) `community_members.created_by` did not exist, then (2) the
-- replay tried to filter on the enum value 'announcer' which is not in
-- public.community_member_role. The enum is ('member','moderator','owner')
-- so we only copy across the rows that actually exist.

insert into public.community_moderators (community_id, user_id, scope, assigned_by)
select community_id, user_id, 'moderator', user_id
from public.community_members
where role = 'moderator'
on conflict do nothing;
