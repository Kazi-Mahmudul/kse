-- Layer 1c — approval RPC.
-- Wraps the three writes (insert communities, insert owner community_member,
-- flip community_requests.status) in one transaction so a failure on any
-- step rolls back the others. Called by the Edge Function via admin's
-- service-role client. SECURITY DEFINER + restricted search_path so the
-- RPC body can insert into tables the caller (the anon JWT) cannot.

create or replace function public.approve_community_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_slug_override text
)
returns table (community_id uuid, request_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.community_requests%rowtype;
  v_community_id uuid;
  v_slug text;
begin
  select * into v_req
  from public.community_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception 'Community request not found';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'This request has already been reviewed';
  end if;

  -- Slug: prefer admin-supplied (already validated), else derive from the
  -- request name. The slug column has a unique constraint so append a
  -- short random suffix on conflict.
  v_slug := p_slug_override;
  if v_slug is null or v_slug = '' then
    v_slug := lower(regexp_replace(v_req.name, '[^a-z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    v_slug := substr(coalesce(nullif(v_slug, ''), 'community'), 1, 40);
  end if;
  while exists (select 1 from public.communities where slug = v_slug) loop
    v_slug := substr(v_slug, 1, 35) || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.communities (
    name, slug, description, university_id, department_id,
    category_id, cover_image_url, created_by, status
  )
  values (
    v_req.name, v_slug, v_req.description, v_req.university_id, v_req.department_id,
    v_req.category_id, v_req.image_url, v_req.requested_by, 'active'
  )
  returning id into v_community_id;

  insert into public.community_members (community_id, user_id, role)
  values (v_community_id, v_req.requested_by, 'owner')
  on conflict (community_id, user_id) do update set role = 'owner';

  insert into public.community_moderators (community_id, user_id, scope, assigned_by)
  values (v_community_id, v_req.requested_by, 'announcer', p_admin_id)
  on conflict do nothing;

  -- proposed_rules (jsonb array of strings) → community_rules rows.
  insert into public.community_rules (community_id, content, sort_order)
  select v_community_id, r.value::text, r.ordinality - 1
  from jsonb_array_elements(coalesce(v_req.proposed_rules, '[]'::jsonb)) with ordinality as r(value, ordinality)
  where r.value ?| array['content'];

  update public.community_requests
  set status = 'approved',
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      community_id = v_community_id
  where id = p_request_id;

  return query select v_community_id, p_request_id;
end;
$$;

-- Only the service-role Edge Function invokes this. No client grants.
revoke all on function public.approve_community_request(uuid, uuid, text) from public;
