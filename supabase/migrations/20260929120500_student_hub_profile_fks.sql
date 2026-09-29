-- ============================================================
-- Student Hub — point user FKs at profiles(id)
-- Migration: 20260929120500_student_hub_profile_fks.sql
--
-- The initial Student Hub migration declared student-owned FKs
-- (book owner, research profile, research request sender, listing
-- submitter) against auth.users(id). The rest of the codebase
-- (mess_members, community tables) references profiles(id) instead —
-- that is what makes `profiles!<fk>(...)` embeds resolve in PostgREST.
-- This migration swaps the FKs to profiles(id) with the same
-- constraint names so all client joins keep working.
-- ============================================================

alter table public.student_book_listings
  drop constraint student_book_listings_owner_id_fkey;
alter table public.student_book_listings
  add constraint student_book_listings_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete cascade;

alter table public.research_profiles
  drop constraint research_profiles_user_id_fkey;
alter table public.research_profiles
  add constraint research_profiles_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.research_requests
  drop constraint research_requests_from_user_id_fkey;
alter table public.research_requests
  add constraint research_requests_from_user_id_fkey
  foreign key (from_user_id) references public.profiles(id) on delete cascade;

alter table public.student_hub_listings
  drop constraint student_hub_listings_submitted_by_fkey;
alter table public.student_hub_listings
  add constraint student_hub_listings_submitted_by_fkey
  foreign key (submitted_by) references public.profiles(id) on delete set null;
