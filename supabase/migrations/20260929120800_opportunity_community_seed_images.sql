-- ============================================================
-- Seed images for opportunities & communities
-- Migration: 20260929120800_opportunity_community_seed_images.sql
--
-- Fills image_url for the seeded scholarship (40), internship (7),
-- workshop (1) and event (1) opportunities, and cover_image_url for
-- the four seeded communities, so Explore cards and Community list
-- cards show photos instead of initials/tinted fallbacks.
--
-- All URLs are Unsplash images, checked live (HTTP 200) and
-- subject-verified. Idempotent: only fills empty image columns, so
-- admin-supplied images are never overwritten.
-- ============================================================

-- ── Scholarships: 10 study/campus-themed images, cycled by title ────────────

with pool(idx, url) as (values
  (0, 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80'),
  (1, 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80'),
  (2, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80'),
  (3, 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80'),
  (4, 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800&q=80'),
  (5, 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80'),
  (6, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80'),
  (7, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80'),
  (8, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80'),
  (9, 'https://images.unsplash.com/photo-1521056787327-165dc2a32836?w=800&q=80')
),
ranked as (
  select id, (row_number() over (order by title) - 1) % 10 as idx
  from public.opportunities
  where type = 'scholarship' and image_url is null
)
update public.opportunities o
set image_url = pool.url
from ranked
join pool on pool.idx = ranked.idx
where o.id = ranked.id;

-- ── Internships: 7 office/workspace images, one per listing ─────────────────

with pool(idx, url) as (values
  (0, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'),
  (1, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80'),
  (2, 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80'),
  (3, 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80'),
  (4, 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80'),
  (5, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80'),
  (6, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80')
),
ranked as (
  select id, (row_number() over (order by title) - 1) % 7 as idx
  from public.opportunities
  where type = 'internship' and image_url is null
)
update public.opportunities o
set image_url = pool.url
from ranked
join pool on pool.idx = ranked.idx
where o.id = ranked.id;

-- ── Workshop & event ─────────────────────────────────────────────────────────

update public.opportunities set
  image_url = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'
where type = 'workshop' and title like 'Hands-on GitHub%' and image_url is null;

update public.opportunities set
  image_url = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'
where type = 'event' and title like 'Khulna Tech Meetup%' and image_url is null;

-- ── Community cover images ───────────────────────────────────────────────────

update public.communities set
  cover_image_url = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80'
where slug = 'khulna-writers' and cover_image_url is null;

update public.communities set
  cover_image_url = 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80'
where slug = 'kuet-robotics' and cover_image_url is null;

update public.communities set
  cover_image_url = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80'
where slug = 'nwu-bcs-prep' and cover_image_url is null;

update public.communities set
  cover_image_url = 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80'
where slug = 'kuet-cse-club' and cover_image_url is null;
