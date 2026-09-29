-- ============================================================
-- Student Hub — seed listing & book photos
-- Migration: 20260929120700_student_hub_seed_images.sql
--
-- Fills image_url / image_urls for the demo records seeded in
-- 20260929120400_seed_student_hub.sql so cards and detail pages
-- show photos instead of the initials fallback.
--
-- All URLs are Unsplash images, checked live (HTTP 200) and
-- subject-verified. Cover goes in image_url (list cards), the
-- same photo plus extras go in image_urls (detail gallery).
--
-- Idempotent: only touches rows whose image columns are still
-- empty, so admin/user uploads are never overwritten.
-- ============================================================

-- ── Listings ────────────────────────────────────────────────────────────────

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000001' and image_url is null; -- Boimela Bookshop

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000002' and image_url is null; -- Khulna Public Library

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1503602642458-232111445657?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1503602642458-232111445657?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000003' and image_url is null; -- Royal Stationery & Books

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1526243741027-444d633d7365?w=800&q=80',
  image_urls = array[
    'https://images.unsplash.com/photo-1526243741027-444d633d7365?w=800&q=80',
    'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=80'
  ]
where id = 'bbbbbbb1-0000-4000-8000-000000000004' and image_url is null; -- Fresh & Clean Laundry

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000005' and image_url is null; -- Sparkle Dry Cleaners

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000006' and image_url is null; -- Rahman Electric Works

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000007' and image_url is null; -- Ali Plumbing Service

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000008' and image_url is null; -- CoolCare AC Service

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000009' and image_url is null; -- Mess Fan & Repair

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000010' and image_url is null; -- KUET Gate Bicycle Parking

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000011' and image_url is null; -- Sonadanga Bike Parking

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000012' and image_url is null; -- Rupsha Stand Motorcycle Parking

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
  image_urls = array[
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80'
  ]
where id = 'bbbbbbb1-0000-4000-8000-000000000013' and image_url is null; -- Campus Cafe

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
  image_urls = array[
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
    'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&q=80'
  ]
where id = 'bbbbbbb1-0000-4000-8000-000000000014' and image_url is null; -- Bismillah Hotel & Restaurant

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1562564055-71e051d33c19?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000015' and image_url is null; -- Print Point

update public.student_hub_listings set
  image_url = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  image_urls = array['https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80']
where id = 'bbbbbbb1-0000-4000-8000-000000000016' and image_url is null; -- Ghorer Bazar Super Shop

-- ── Book exchange demo listings (owned by the demo student) ─────────────────

update public.student_book_listings set image_urls = array[
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80'
]
where title = 'Introduction to Algorithms' and cardinality(image_urls) = 0;

update public.student_book_listings set image_urls = array[
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80'
]
where title = 'Higher Mathematics for Engineers' and cardinality(image_urls) = 0;

update public.student_book_listings set image_urls = array[
  'https://images.unsplash.com/photo-1521056787327-165dc2a32836?w=800&q=80'
]
where title like 'Physics for Engineers%' and cardinality(image_urls) = 0;
