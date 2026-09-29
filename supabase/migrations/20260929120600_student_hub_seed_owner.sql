-- ============================================================
-- Student Hub — attach demo user content to the student1 demo user
-- Migration: 20260929120600_student_hub_seed_owner.sql
--
-- The generic seed (20260929120400) attached the book listings and
-- research profile to the FIRST profile, which is the admin in this
-- project. Reassign them to the student1@kse.local demo user so the
-- mobile "My listings" / "My research profile" flows have data.
-- No-op when that user does not exist.
-- ============================================================

do $$
declare
  v_student uuid;
begin
  select id into v_student from auth.users where email = 'student1@kse.local' limit 1;
  if v_student is null then
    raise notice 'student1@kse.local not found — keeping demo ownership as-is.';
    return;
  end if;

  update public.student_book_listings
  set owner_id = v_student
  where owner_id <> v_student
    and title in (
      'Introduction to Algorithms',
      'Higher Mathematics for Engineers',
      'Physics for Engineers — Vol 1'
    );

  update public.research_profiles
  set user_id = v_student
  where user_id <> v_student
    and research_interest = 'Computer Vision';

  raise notice 'Student Hub demo content reassigned to student1@kse.local';
end $$;
