-- Layer 1f — followed topics in recommendations.
-- Spec §Discovery names followed topics as a signal. The previous discovery
-- function (recommended_communities) only consulted university/department
-- /skills/interests. We add user_followed_topics and extend the score.

create table public.user_followed_topics (
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id, topic)
);

create index user_followed_topics_topic_idx on public.user_followed_topics (topic);

alter table public.user_followed_topics enable row level security;

-- Each user manages their own topic list.
create policy user_followed_topics_select_own on public.user_followed_topics
  for select to authenticated using (user_id = auth.uid());

create policy user_followed_topics_insert_own on public.user_followed_topics
  for insert to authenticated with check (user_id = auth.uid());

create policy user_followed_topics_delete_own on public.user_followed_topics
  for delete to authenticated using (user_id = auth.uid());

-- ── Extend recommended_communities ───────────────────────────────────────────
-- Each followed topic token that appears in community.name / description
-- adds +2 to the score, mirroring how interests/skills are scored. Also
-- adds a +1 per category token match (category names are short labels like
-- 'Career' / 'Skills') so following a topic aligns with a category.

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
           coalesce(array_agg(s.name) filter (where s.name is not null), '{}') as skills,
           coalesce(array_agg(ut.topic) filter (where ut.topic is not null), '{}') as topics
    from public.profiles p
    left join public.user_skills us on us.user_id = p.id
    left join public.skills s on s.id = us.skill_id
    left join public.user_followed_topics ut on ut.user_id = p.id
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
      + (case when exists (
            select 1 from unnest(me.topics) t
            where char_length(t) > 1
              and (
                c.name ilike '%' || t || '%'
                or c.description ilike '%' || t || '%'
                or cat.name ilike '%' || t || '%'
              ))
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
