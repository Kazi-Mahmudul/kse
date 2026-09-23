-- Community redesign (9/9): rule-based discovery functions.
-- No AI — profile signals (university, department, skills, interests) and
-- popularity only. Called from the mobile app via .rpc().

create or replace function public.recommended_communities(p_limit integer default 10)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  cover_image_url text,
  category_id uuid,
  category_name text,
  university_id uuid,
  department_id uuid,
  member_count integer,
  score integer
)
language sql stable security definer set search_path = public as $$
  with me as (
    select p.university_id, p.department_id, p.interests,
           coalesce(array_agg(s.name) filter (where s.name is not null), '{}') as skills
    from public.profiles p
    left join public.user_skills us on us.user_id = p.id
    left join public.skills s on s.id = us.skill_id
    where p.id = auth.uid()
    group by p.id, p.university_id, p.department_id, p.interests
  )
  select
    c.id, c.name, c.slug, c.description, c.cover_image_url,
    c.category_id, cat.name, c.university_id, c.department_id, c.member_count,
    (
      (case when c.university_id is not null and c.university_id = me.university_id then 3 else 0 end)
      + (case when c.department_id is not null and c.department_id = me.department_id then 5 else 0 end)
      + (case when exists (
            select 1 from unnest(me.skills) sk
            where char_length(sk) > 2
              and (c.name ilike '%' || sk || '%' or c.description ilike '%' || sk || '%'))
          then 2 else 0 end)
      + (case when exists (
            select 1 from unnest(me.interests) i
            where char_length(i) > 2
              and (c.name ilike '%' || i || '%' or c.description ilike '%' || i || '%'))
          then 2 else 0 end)
    ) as score
  from public.communities c
  left join public.community_categories cat on cat.id = c.category_id
  cross join me
  where c.status = 'active'
    and not exists (
      select 1 from public.community_members m
      where m.community_id = c.id and m.user_id = auth.uid())
  order by score desc, c.member_count desc, c.name
  limit greatest(p_limit, 0);
$$;

create or replace function public.trending_community_posts(
  p_limit integer default 10,
  p_days integer default 7
)
returns table (
  id uuid,
  community_id uuid,
  community_name text,
  community_slug text,
  author_id uuid,
  post_type text,
  content text,
  image_url text,
  link_url text,
  comment_count integer,
  reaction_count integer,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    p.id, p.community_id, c.name, c.slug, p.author_id, p.post_type,
    p.content, p.image_url, p.link_url, p.comment_count, p.reaction_count, p.created_at
  from public.community_posts p
  join public.communities c on c.id = p.community_id
  where p.status = 'active'
    and c.status = 'active'
    and p.created_at > now() - make_interval(days => p_days)
  order by (2 * p.comment_count + p.reaction_count) desc, p.created_at desc
  limit greatest(p_limit, 0);
$$;
