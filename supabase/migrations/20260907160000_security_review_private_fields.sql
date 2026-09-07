-- Step 20 security review (spec §14, §34): tighten sensitive reads.
--
-- Two gaps found during review, both traced to over-broad SELECT policies:
--
--   1. profiles.phone was readable by any authenticated user through the
--      `profiles_select_authenticated using (true)` policy. Phone is listed
--      as private-by-default in spec §34, so we withdraw column-level SELECT
--      from the shared anon/authenticated roles and re-expose it to the
--      owner only through a SECURITY DEFINER function (public fields such as
--      full_name keep flowing through the existing policy).
--
--   2. Portfolio tables (and user_portfolio_links) had SELECT `using (true)`,
--      so the mobile "my" lists returned every user's rows and leaked resume
--      / certificate URLs. SELECT is now owner-only, matching the existing
--      insert/update/delete policies.

-- ── 1) profiles.phone → owner-only (column privilege + definer function) ────
--
-- `profiles` carries a table-level SELECT grant to anon/authenticated, which
-- covers every column including phone. Column-level `revoke select (phone)`
-- alone is a no-op against a table-level grant, so we drop the table-level
-- SELECT and re-grant it at column level for the public columns only.

revoke select on public.profiles from anon, authenticated;

grant select (id, full_name, avatar_url, university_id, department_id,
              academic_level, bio, interests, is_verified, status,
              created_at, updated_at)
  on public.profiles to anon, authenticated;

create or replace function public.my_phone()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select phone from public.profiles where id = auth.uid();
$$;

-- ── 2) portfolio SELECT → owner-only ────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['user_skills', 'user_projects', 'user_certificates',
                           'user_achievements', 'user_research', 'user_resumes',
                           'user_portfolio_links']
  loop
    execute format('drop policy if exists %I on public.%I',
                   t || '_select_authenticated', t);

    execute format('create policy %I on public.%I for select to authenticated
                    using (user_id = auth.uid())',
                   t || '_select_own', t);
  end loop;
end $$;
