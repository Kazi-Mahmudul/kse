-- ============================================================
-- Student Hub — seed data
-- Migration: 20260929120400_seed_student_hub.sql
--
-- Idempotent demo data: 4 categories, 17 listings across Khulna city
-- (one intentionally pending user submission, one expired offer to
-- demonstrate auto-expiry), offers, book exchange listings and a
-- research profile (attached to the first existing profile so the
-- demo student can manage them).
--
-- Contact details use the 013xx demo range — replace with real data
-- before production use.
-- ============================================================

do $$
declare
  v_demo_user uuid;
  v_expired date := current_date - 10;
  v_valid_until date := current_date + 90;
begin

  select id into v_demo_user from public.profiles order by created_at limit 1;

  -- ── Categories ────────────────────────────────────────────────────────────

  insert into public.student_hub_categories
    (id, slug, name, description, icon, features, sort_order, is_active)
  values
    ('aaaaaaa1-0000-4000-8000-000000000001', 'study-research', 'Study & Research',
     'Books, libraries and research collaboration', 'book-outline',
     array['book_exchange', 'research_partners']::text[], 1, true),
    ('aaaaaaa1-0000-4000-8000-000000000002', 'daily-life', 'Daily Life',
     'Laundry, electricians, plumbers and other local services', 'construct-outline',
     array[]::text[], 2, true),
    ('aaaaaaa1-0000-4000-8000-000000000003', 'mobility', 'Mobility',
     'Bicycle and motorcycle parking around the city', 'bicycle-outline',
     array[]::text[], 3, true),
    ('aaaaaaa1-0000-4000-8000-000000000004', 'student-deals', 'Student Deals',
     'Student discount partner shops and offers', 'pricetag-outline',
     array[]::text[], 4, true)
  on conflict (slug) do nothing;

  -- ── Listings (published unless noted) ─────────────────────────────────────

  insert into public.student_hub_listings
    (id, category_id, name, service_type, summary, description, status, verified,
     verified_at, last_verified_at, address, area, city, latitude, longitude,
     phone, opening_hours, opens_at, closes_at, price_note, price_type, services,
     image_url, published_at, source, created_at)
  values
    -- Study & Research
    ('bbbbbbb1-0000-4000-8000-000000000001',
     'aaaaaaa1-0000-4000-8000-000000000001', 'Boimela Bookshop', 'bookshop',
     'Academic and used books near Shibbari',
     'Family-run bookshop stocking university textbooks, used novels and school supplies. Academic discount for students on selected titles.',
     'published', true, now() - interval '5 days', now() - interval '5 days',
     '12 KDA Avenue, Shibbari', 'Shibbari', 'Khulna', 22.8143, 89.5442,
     '01312-400101', 'Sat–Thu 9:00–21:00', '09:00', '21:00',
     'Used novels from BDT 120', 'starting_from',
     array['Academic books', 'Used books', 'Stationery']::text[],
     null, now() - interval '30 days', 'admin', now() - interval '30 days'),

    ('bbbbbbb1-0000-4000-8000-000000000002',
     'aaaaaaa1-0000-4000-8000-000000000001', 'Khulna Public Library', 'library',
     'Public lending library on Station Road',
     'Government public library with a study hall, newspaper corner and lending membership. Membership: BDT 100/year for students.',
     'published', true, now() - interval '40 days', now() - interval '40 days',
     'Station Road, Khulna Sadar', 'Sadar', 'Khulna', 22.8106, 89.5644,
     '01312-400102', 'Sun–Thu 8:00–20:00', '08:00', '20:00',
     'Membership BDT 100/year (students)', 'fixed',
     array['Lending library', 'Study hall', 'Newspapers']::text[],
     null, now() - interval '60 days', 'admin', now() - interval '60 days'),

    ('bbbbbbb1-0000-4000-8000-000000000003',
     'aaaaaaa1-0000-4000-8000-000000000001', 'Royal Stationery & Books', 'bookshop',
     'Stationery and guide books in Sonadanga',
     'Guide books, lab equipment and stationery for school and university students.',
     'published', false, null, null,
     'Holding 8, Sonadanga R/A', 'Sonadanga', 'Khulna', 22.8268, 89.5449,
     '01312-400103', 'Sat–Thu 10:00–20:30', '10:00', '20:30',
     'Guides from BDT 250', 'starting_from',
     array['Stationery', 'Guide books', 'Lab equipment']::text[],
     null, now() - interval '20 days', 'admin', now() - interval '20 days'),

    -- Daily Life
    ('bbbbbbb1-0000-4000-8000-000000000004',
     'aaaaaaa1-0000-4000-8000-000000000002', 'Fresh & Clean Laundry', 'laundry',
     'Wash, dry cleaning with free pickup in Shibbari–Gollamari',
     'Laundry and dry-cleaning service with free pickup and delivery inside Shibbari, Gollamari and KDA areas. 24-hour turnaround for regular wash.',
     'published', true, now() - interval '8 days', now() - interval '8 days',
     '45/2 Khan Jahan Ali Road, Shibbari', 'Shibbari', 'Khulna', 22.8171, 89.5407,
     '01312-400104', 'Daily 8:00–22:00', '08:00', '22:00',
     'Wash from BDT 30/kg · Dry clean from BDT 80/item', 'starting_from',
     array['Wash', 'Dry cleaning', 'Pickup & delivery']::text[],
     null, now() - interval '25 days', 'admin', now() - interval '25 days'),

    ('bbbbbbb1-0000-4000-8000-000000000005',
     'aaaaaaa1-0000-4000-8000-000000000002', 'Sparkle Dry Cleaners', 'laundry',
     'Dry cleaning and pressing in Sonadanga',
     'Neighbourhood dry cleaner specializing in panjabi, sherwani and formal wear.',
     'published', false, null, null,
     'Road 4, Sonadanga Thikana', 'Sonadanga', 'Khulna', 22.8229, 89.5395,
     '01312-400105', 'Sat–Thu 9:00–21:00', '09:00', '21:00',
     'Pressing from BDT 25/item', 'starting_from',
     array['Dry cleaning', 'Pressing']::text[],
     null, now() - interval '15 days', 'admin', now() - interval '15 days'),

    ('bbbbbbb1-0000-4000-8000-000000000006',
     'aaaaaaa1-0000-4000-8000-000000000002', 'Rahman Electric Works', 'electrician',
     'Licensed electrician covering Boyra and Khalishpur',
     'Wiring, switchboard repair and fan installation. Emergency call-out after 8 PM for existing customers.',
     'published', true, now() - interval '12 days', now() - interval '12 days',
     'Block B, Boyra Housing Society', 'Boyra', 'Khulna', 22.8337, 89.5458,
     '01312-400106', 'Daily 9:00–21:00 · Emergency after 21:00', '09:00', '21:00',
     'Visit charge from BDT 150', 'starting_from',
     array['Wiring', 'Fan installation', 'Emergency service']::text[],
     null, now() - interval '35 days', 'admin', now() - interval '35 days'),

    ('bbbbbbb1-0000-4000-8000-000000000007',
     'aaaaaaa1-0000-4000-8000-000000000002', 'Ali Plumbing Service', 'plumber',
     'Plumber for messes and hostels in Khalishpur',
     'Bathroom fittings, tap and pipeline repair. Monthly maintenance contracts for student messes.',
     'published', false, null, null,
     'Khalishpur Main Road', 'Khalishpur', 'Khulna', 22.8496, 89.5486,
     '01312-400107', 'Daily 8:30–20:00', '08:30', '20:00',
     'Repair from BDT 200', 'starting_from',
     array['Pipeline repair', 'Bathroom fittings']::text[],
     null, now() - interval '18 days', 'admin', now() - interval '18 days'),

    ('bbbbbbb1-0000-4000-8000-000000000008',
     'aaaaaaa1-0000-4000-8000-000000000002', 'CoolCare AC Service', 'ac_technician',
     'AC servicing and gas refill across Khulna city',
     'Split AC servicing, gas refilling and installation with 30-day service warranty.',
     'published', true, now() - interval '6 days', now() - interval '6 days',
     'Nirala R/A, Road 3', 'Nirala', 'Khulna', 22.8392, 89.5390,
     '01312-400108', 'Sat–Thu 9:00–20:00', '09:00', '20:00',
     'General service from BDT 800', 'starting_from',
     array['AC servicing', 'Gas refill', 'Installation']::text[],
     null, now() - interval '22 days', 'admin', now() - interval '22 days'),

    ('bbbbbbb1-0000-4000-8000-000000000009',
     'aaaaaaa1-0000-4000-8000-000000000002', 'Mess Fan & Repair', 'fan_repair',
     'Ceiling and table fan repair in Gollamari',
     'Fan winding, capacitor replacement and balancing for student messes.',
     'published', false, null, null,
     'Gollamari Bus Stand Road', 'Gollamari', 'Khulna', 22.8077, 89.5445,
     '01312-400109', 'Daily 9:00–19:00', '09:00', '19:00',
     'Capacitor replacement from BDT 350', 'approximate',
     array['Ceiling fan repair', 'Table fan repair']::text[],
     null, now() - interval '12 days', 'admin', now() - interval '12 days'),

    -- Mobility
    ('bbbbbbb1-0000-4000-8000-000000000010',
     'aaaaaaa1-0000-4000-8000-000000000003', 'KUET Gate Bicycle Parking', 'parking',
     'Free supervised bicycle parking at KUET main gate',
     'Fenced bicycle parking beside the KUET main gate. Security guard on duty during opening hours. No motorcycle parking.',
     'published', true, now() - interval '20 days', now() - interval '20 days',
     'KUET Main Gate, Khulna–Mongla Highway', 'KUET Area', 'Khulna', 22.9000, 89.5011,
     null, 'Daily 6:00–23:00', '06:00', '23:00',
     'Free', 'fixed',
     array['Bicycle parking', 'Security available']::text[],
     null, now() - interval '50 days', 'admin', now() - interval '50 days'),

    ('bbbbbbb1-0000-4000-8000-000000000011',
     'aaaaaaa1-0000-4000-8000-000000000003', 'Sonadanga Bike Parking', 'parking',
     'Covered motorcycle parking near Sonadanga main road',
     'Covered parking for motorcycles and bicycles with CCTV. Monthly pass available.',
     'published', false, null, null,
     'Main Road 2, Sonadanga R/A', 'Sonadanga', 'Khulna', 22.8249, 89.5430,
     '01312-400111', 'Daily 6:00–22:00', '06:00', '22:00',
     'BDT 20/day · BDT 400/month (motorcycle)', 'fixed',
     array['Motorcycle parking', 'Bicycle parking', 'CCTV', 'Covered']::text[],
     null, now() - interval '28 days', 'admin', now() - interval '28 days'),

    ('bbbbbbb1-0000-4000-8000-000000000012',
     'aaaaaaa1-0000-4000-8000-000000000003', 'Rupsha Stand Motorcycle Parking', 'parking',
     'Open motorcycle parking at Rupsha ferry ghat stand',
     'Informal open-air motorcycle parking serving commuters at Rupsha stand. No guard after dark.',
     'published', false, null, null,
     'Rupsha Ferry Ghat Road', 'Rupsha', 'Khulna', 22.7767, 89.5718,
     null, 'Daylight hours', null, null,
     'BDT 10/day (motorcycle)', 'fixed',
     array['Motorcycle parking']::text[],
     null, now() - interval '14 days', 'admin', now() - interval '14 days'),

    -- Student Deals
    ('bbbbbbb1-0000-4000-8000-000000000013',
     'aaaaaaa1-0000-4000-8000-000000000004', 'Campus Cafe', 'cafe',
     'Coffee, snacks and study corners beside KUET',
     'Cafe with WiFi, power outlets and quiet study corners. Student discount on the full menu.',
     'published', true, now() - interval '9 days', now() - interval '9 days',
     'Beside KUET Main Gate', 'KUET Area', 'Khulna', 22.8996, 89.5023,
     '01312-400113', 'Daily 8:00–23:00', '08:00', '23:00',
     'Coffee from BDT 60', 'starting_from',
     array['WiFi', 'Study corner', 'Snacks']::text[],
     null, now() - interval '45 days', 'admin', now() - interval '45 days'),

    ('bbbbbbb1-0000-4000-8000-000000000014',
     'aaaaaaa1-0000-4000-8000-000000000004', 'Bismillah Hotel & Restaurant', 'restaurant',
     'Rice-and-curry restaurant in Shibbari',
     'Budget rice-and-curry meals popular with university students. Discount on lunch set meals.',
     'published', true, now() - interval '15 days', now() - interval '15 days',
     '78 Shibbari Main Road', 'Shibbari', 'Khulna', 22.8158, 89.5455,
     '01312-400114', 'Daily 8:00–22:30', '08:00', '22:30',
     'Lunch set from BDT 90', 'starting_from',
     array['Rice & curry', 'Takeaway']::text[],
     null, now() - interval '55 days', 'admin', now() - interval '55 days'),

    ('bbbbbbb1-0000-4000-8000-000000000015',
     'aaaaaaa1-0000-4000-8000-000000000004', 'Print Point', 'shop',
     'Photocopy, print and thesis binding in Sonadanga',
     'Photocopy, lamination, spiral binding and thesis printing for students.',
     'published', true, now() - interval '7 days', now() - interval '7 days',
     'Sonadanga Main Road, Beside Bank', 'Sonadanga', 'Khulna', 22.8258, 89.5417,
     '01312-400115', 'Sat–Thu 9:00–21:00', '09:00', '21:00',
     'Photocopy BDT 1/page', 'fixed',
     array['Photocopy', 'Printing', 'Thesis binding', 'Lamination']::text[],
     null, now() - interval '48 days', 'admin', now() - interval '48 days'),

    ('bbbbbbb1-0000-4000-8000-000000000016',
     'aaaaaaa1-0000-4000-8000-000000000004', 'Ghorer Bazar Super Shop', 'shop',
     'Grocery super shop in Boyra',
     'Neighbourhood grocery shop. An older student offer has expired — kept here so the app demonstrates auto-expiry.',
     'published', true, now() - interval '30 days', now() - interval '30 days',
     'Boyra Main Road, Block C', 'Boyra', 'Khulna', 22.8341, 89.5477,
     '01312-400116', 'Daily 8:00–22:00', '08:00', '22:00',
     null, null,
     array['Grocery', 'Household items']::text[],
     null, now() - interval '70 days', 'admin', now() - interval '70 days')

  on conflict (id) do nothing;

  -- ── Offers ────────────────────────────────────────────────────────────────
  -- Active offers (the trigger flips has_student_discount automatically) …

  insert into public.student_hub_offers
    (listing_id, title, discount_kind, discount_value, applies_to,
     student_id_required, valid_until, terms)
  values
    ('bbbbbbb1-0000-4000-8000-000000000001', '10% off academic books', 'percent', 10,
     'Academic textbooks and guides', true, v_valid_until, 'Not combinable with other offers'),
    ('bbbbbbb1-0000-4000-8000-000000000003', '5% off stationery', 'percent', 5,
     'Stationery items', true, v_valid_until, null),
    ('bbbbbbb1-0000-4000-8000-000000000013', '10% student discount', 'percent', 10,
     'Full menu', true, v_valid_until, 'Dine-in only'),
    ('bbbbbbb1-0000-4000-8000-000000000014', 'BDT 10 off lunch set', 'amount', 1000,
     'Lunch set meals (12:00–16:00)', true, v_valid_until, 'Weekdays only'),
    ('bbbbbbb1-0000-4000-8000-000000000015', '20% off thesis printing', 'percent', 20,
     'Black & white thesis printing', true, v_valid_until, 'Min 50 pages')
  on conflict do nothing;

  -- … and one intentionally expired offer (auto-hidden by RLS + queries).
  insert into public.student_hub_offers
    (listing_id, title, discount_kind, discount_value, applies_to,
     student_id_required, valid_from, valid_until, terms)
  values
    ('bbbbbbb1-0000-4000-8000-000000000016', '5% off groceries', 'percent', 5,
     'All groceries', true, v_expired - 30, v_expired, null)
  on conflict do nothing;

  -- ── User-owned demo data (needs at least one profile) ─────────────────────

  if v_demo_user is null then
    raise notice 'No profiles yet — skipping user-submitted/book/research seeds.';
    return;
  end if;

  -- Pending user submission for the admin review queue demo.
  insert into public.student_hub_listings
    (category_id, name, service_type, summary, description, status, area, city,
     phone, opening_hours, services, source, submitted_by, created_at)
  values
    ('aaaaaaa1-0000-4000-8000-000000000002', 'New Star Laundry', 'laundry',
     'Suggested by a student — needs review',
     'Laundry service near Khulna University entrance. Submitted through the app for admin review.',
     'pending_review', 'Gollamari', 'Khulna', '01312-400117',
     'Daily 9:00–20:00', array['Wash', 'Pressing']::text[],
     'user_submission', v_demo_user, now() - interval '2 days')
  on conflict do nothing;

  insert into public.student_book_listings
    (owner_id, title, author, subject, edition, condition, intent, price,
     expected_exchange, description, contact_preference, phone, status, created_at)
  values
    (v_demo_user, 'Introduction to Algorithms', 'Cormen, Leiserson, Rivest & Stein',
     'Computer Science', '3rd', 'good', 'sell', 65000,
     null, 'CLRS 3rd edition, lightly used, no torn pages. Selling because the course is done.',
     'in_app', null, 'active', now() - interval '6 days'),
    (v_demo_user, 'Higher Mathematics for Engineers', 'B.S. Grewal',
     'Mathematics', '42nd', 'like_new', 'exchange', null,
     'Any linear algebra or statistics textbook',
     'Clean copy. Looking to swap for a linear algebra or statistics book of similar level.',
     'in_app', null, 'active', now() - interval '3 days'),
    (v_demo_user, 'Physics for Engineers — Vol 1', 'B.L. Theraja',
     'Physics', '2nd', 'fair', 'give_away', null, null,
     'Older edition with some pencil notes. Free to any first-year student.',
     'phone', '01312-400118', 'active', now() - interval '1 day')
  on conflict do nothing;

  insert into public.research_profiles
    (user_id, research_interest, discipline, topic, skills, collaboration_type,
     institution, district, availability, bio, status)
  values
    (v_demo_user, 'Computer Vision', 'Computer Science & Engineering',
     'Low-cost road damage detection from smartphone video',
     array['Python', 'Machine Learning', 'OpenCV']::text[], 'partner',
     'Khulna University of Engineering & Technology', 'Khulna',
     'Evenings & weekends',
     'Final-year undergrad looking for a research partner for a road-condition mapping project. Happy to co-author a conference paper.',
     'active')
  on conflict (user_id) do nothing;

end $$;
