-- ============================================================
-- Seed avatar photos for the three demo tutors
-- Migration: 20260929120900_tutor_avatar_seed_images.sql
--
-- The tuition finder's TutorCard renders the tutor's profile
-- avatar; the three seeded demo tutors had none, so the cards
-- fell back to initials. These are verified Unsplash portraits
-- (HTTP 200 + subject-checked), square face-cropped.
--
-- Idempotent: only fills a null avatar_url, so a tutor's own
-- upload is never overwritten.
-- ============================================================

update public.profiles set
  avatar_url = 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&h=400&fit=crop&crop=faces&q=80'
where id = '22222222-2222-2222-2222-222222222211' and avatar_url is null; -- Tanvir Ahmed

update public.profiles set
  avatar_url = 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400&h=400&fit=crop&crop=faces&q=80'
where id = '22222222-2222-2222-2222-222222222212' and avatar_url is null; -- Nusrat Jahan

update public.profiles set
  avatar_url = 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces&q=80'
where id = '22222222-2222-2222-2222-222222222213' and avatar_url is null; -- Rafiul Islam
