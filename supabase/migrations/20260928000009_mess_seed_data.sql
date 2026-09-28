-- ============================================================
-- Mess Management System — Seed Data
-- Migration: 20260928000009_mess_seed_data.sql
-- Creates realistic test data for development/demo
-- Run AFTER all other mess migrations
-- ============================================================

-- This migration is idempotent — use ON CONFLICT DO NOTHING throughout.
-- It creates its own test profiles and uses them for mess data.

DO $$
DECLARE
  -- Known demo profile IDs (replace with real IDs in production)
  -- Using a fixed base so the same run produces consistent results
  demo_user_1 UUID := '00000000-0000-0000-0000-000000000001';
  demo_user_2 UUID := '00000000-0000-0000-0000-000000000002';
  demo_user_3 UUID := '00000000-0000-0000-0000-000000000003';
  demo_user_4 UUID := '00000000-0000-0000-0000-000000000004';
  demo_user_5 UUID := '00000000-0000-0000-0000-000000000005';

  -- Mess IDs
  mess_1_id UUID;
  mess_2_id UUID;

  -- Month boundaries
  today DATE := CURRENT_DATE;
  yesterday DATE := today - 1;

  i INT;
  v_meal_date DATE;
BEGIN

  -- ============================================================
  -- Use the FIRST profile for ALL mess seed data.
  -- This ensures the admin/first-user who runs the seed always sees
  -- the seeded mess data in their mobile app. All demo mess members
  -- are the same person (the admin) to keep FK references simple.
  -- ============================================================
  IF EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
    SELECT id INTO demo_user_1 FROM profiles LIMIT 1;
    demo_user_2 := demo_user_1;
    demo_user_3 := demo_user_1;
    demo_user_4 := demo_user_1;
    demo_user_5 := demo_user_1;
    RAISE NOTICE 'Using first profile for mess seed data (user_id: %)', demo_user_1;
  ELSE
    RAISE NOTICE 'No profiles found — skipping mess seed data. Create profiles first, then re-run.';
    RETURN;
  END IF;

  -- ============================================================
  -- Create Mess #1: "12 No. Bachelor Mess" (Boyra, Khulna)
  -- ============================================================
  INSERT INTO messes (id, code, name, location, address, description, max_members, manager_id, is_active, created_by)
  VALUES (
    gen_random_uuid(),
    'KSE-MESS-8F42',
    '12 No. Bachelor Mess',
    'Boyra, Khulna',
    'House 12, Road 5, Block B, Boyra Housing Society, Khulna-9000',
    'A comfortable bachelor mess with 10 members. Pure vegetarian and non-veg meals available. Located near Khulna University.',
    10,
    demo_user_1,
    true,
    demo_user_1
  )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO mess_1_id;

  -- If the mess was already created, get its ID
  IF mess_1_id IS NULL THEN
    SELECT id INTO mess_1_id FROM messes WHERE code = 'KSE-MESS-8F42' LIMIT 1;
  END IF;

  -- ============================================================
  -- Create Mess #2: "Green View Mess" (Sonadanga, Khulna)
  -- ============================================================
  INSERT INTO messes (id, code, name, location, address, description, max_members, manager_id, is_active, created_by)
  VALUES (
    gen_random_uuid(),
    'KSE-MESS-3A17',
    'Green View Mess',
    'Sonadanga, Khulna',
    'Holding 45, Road 3, Sonadanga Thana, Khulna-9100',
    'Peaceful mess with modern facilities. 8 member capacity. Non-veg on weekends only.',
    8,
    demo_user_3,
    true,
    demo_user_3
  )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO mess_2_id;

  IF mess_2_id IS NULL THEN
    SELECT id INTO mess_2_id FROM messes WHERE code = 'KSE-MESS-3A17' LIMIT 1;
  END IF;

  -- ============================================================
  -- Mess #1 Members (12 No. Bachelor Mess)
  -- ============================================================
  INSERT INTO mess_members (mess_id, user_id, role, status, joined_at)
  VALUES (mess_1_id, demo_user_1, 'manager', 'active', today - INTERVAL '30 days')
  ON CONFLICT (mess_id, user_id) DO NOTHING;

  INSERT INTO mess_members (mess_id, user_id, role, status, joined_at)
  VALUES
    (mess_1_id, demo_user_2, 'member', 'active', today - INTERVAL '27 days'),
    (mess_1_id, demo_user_3, 'member', 'active', today - INTERVAL '24 days'),
    (mess_1_id, demo_user_4, 'member', 'active', today - INTERVAL '20 days')
  ON CONFLICT (mess_id, user_id) DO NOTHING;

  -- Pending member
  INSERT INTO mess_members (mess_id, user_id, role, status, joined_at)
  VALUES (mess_1_id, demo_user_5, 'member', 'pending', NULL)
  ON CONFLICT (mess_id, user_id) DO NOTHING;

  -- ============================================================
  -- Meal Cutoff Settings for Mess #1
  -- ============================================================
  INSERT INTO meal_cutoff_settings (mess_id, breakfast_cutoff_minutes, lunch_cutoff_minutes, dinner_cutoff_minutes)
  VALUES (mess_1_id, 30, 60, 120)
  ON CONFLICT (mess_id) DO UPDATE SET
    breakfast_cutoff_minutes = EXCLUDED.breakfast_cutoff_minutes,
    lunch_cutoff_minutes = EXCLUDED.lunch_cutoff_minutes,
    dinner_cutoff_minutes = EXCLUDED.dinner_cutoff_minutes;

  -- ============================================================
  -- Bazar Duties for Mess #1 (September 2026)
  -- ============================================================
  INSERT INTO bazar_duties (mess_id, user_id, duty_date, created_by)
  VALUES
    (mess_1_id, demo_user_1, today + INTERVAL '5 days', demo_user_1),
    (mess_1_id, demo_user_2, today + INTERVAL '12 days', demo_user_1),
    (mess_1_id, demo_user_3, today + INTERVAL '19 days', demo_user_1),
    (mess_1_id, demo_user_4, today + INTERVAL '26 days', demo_user_1),
    (mess_1_id, demo_user_1, today + INTERVAL '8 days', demo_user_1),
    (mess_1_id, demo_user_2, today + INTERVAL '15 days', demo_user_1),
    (mess_1_id, demo_user_3, today + INTERVAL '22 days', demo_user_1),
    (mess_1_id, demo_user_4, today + INTERVAL '29 days', demo_user_1)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Meal Records for Mess #1 (last 7 days)
  -- ============================================================
  FOR i IN 0..6 LOOP
    v_meal_date := today - i;

    -- demo_user_1: All meals on
    INSERT INTO meal_records (mess_id, user_id, meal_date, meal_type, state, created_by) VALUES
      (mess_1_id, demo_user_1, v_meal_date, 'breakfast', 'on', demo_user_1),
      (mess_1_id, demo_user_1, v_meal_date, 'lunch', 'on', demo_user_1),
      (mess_1_id, demo_user_1, v_meal_date, 'dinner', 'on', demo_user_1)
    ON CONFLICT (mess_id, user_id, meal_date, meal_type) DO UPDATE SET state = EXCLUDED.state;

    -- demo_user_2: Breakfast off, rest on
    INSERT INTO meal_records (mess_id, user_id, meal_date, meal_type, state, created_by) VALUES
      (mess_1_id, demo_user_2, v_meal_date, 'breakfast', 'off', demo_user_2),
      (mess_1_id, demo_user_2, v_meal_date, 'lunch', 'on', demo_user_2),
      (mess_1_id, demo_user_2, v_meal_date, 'dinner', 'on', demo_user_2)
    ON CONFLICT (mess_id, user_id, meal_date, meal_type) DO UPDATE SET state = EXCLUDED.state;

    -- demo_user_3: All meals on
    INSERT INTO meal_records (mess_id, user_id, meal_date, meal_type, state, created_by) VALUES
      (mess_1_id, demo_user_3, v_meal_date, 'breakfast', 'on', demo_user_3),
      (mess_1_id, demo_user_3, v_meal_date, 'lunch', 'on', demo_user_3),
      (mess_1_id, demo_user_3, v_meal_date, 'dinner', 'on', demo_user_3)
    ON CONFLICT (mess_id, user_id, meal_date, meal_type) DO UPDATE SET state = EXCLUDED.state;

    -- demo_user_4: Breakfast and dinner off
    INSERT INTO meal_records (mess_id, user_id, meal_date, meal_type, state, created_by) VALUES
      (mess_1_id, demo_user_4, v_meal_date, 'breakfast', 'off', demo_user_4),
      (mess_1_id, demo_user_4, v_meal_date, 'lunch', 'on', demo_user_4),
      (mess_1_id, demo_user_4, v_meal_date, 'dinner', 'off', demo_user_4)
    ON CONFLICT (mess_id, user_id, meal_date, meal_type) DO UPDATE SET state = EXCLUDED.state;
  END LOOP;

  -- ============================================================
  -- Bazar Purchases for Mess #1
  -- ============================================================
  INSERT INTO bazar_purchases (mess_id, buyer_id, purchase_date, total_amount, notes, is_verified)
  VALUES
    (mess_1_id, demo_user_1, today - INTERVAL '5 days', 245000, 'Weekly rice, dal, vegetables', true),
    (mess_1_id, demo_user_2, today - INTERVAL '12 days', 320000, 'Fish market + grocery', true),
    (mess_1_id, demo_user_3, today - INTERVAL '19 days', 187500, 'Vegetables and essentials', true),
    (mess_1_id, demo_user_4, today - INTERVAL '26 days', 289000, 'Mixed groceries + cleaning supplies', false)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Bazar Purchase Items
  -- ============================================================
  -- Purchase on today-5 (rice, dal, veg)
  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Premium Rice', 5, 'kg', 5500, 'rice'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_1 AND p.purchase_date = today - INTERVAL '5 days'
  ON CONFLICT DO NOTHING;

  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Masur Dal', 3, 'kg', 12000, 'grocery'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_1 AND p.purchase_date = today - INTERVAL '5 days'
  ON CONFLICT DO NOTHING;

  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Mixed Vegetables', 2.5, 'kg', 4000, 'vegetables'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_1 AND p.purchase_date = today - INTERVAL '5 days'
  ON CONFLICT DO NOTHING;

  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Mustard Oil', 1, 'litre', 16000, 'oil'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_1 AND p.purchase_date = today - INTERVAL '5 days'
  ON CONFLICT DO NOTHING;

  -- Purchase on today-12 (fish)
  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Hilsha Fish', 1.5, 'kg', 85000, 'fish'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_2 AND p.purchase_date = today - INTERVAL '12 days'
  ON CONFLICT DO NOTHING;

  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Rui Fish', 2, 'kg', 40000, 'fish'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_2 AND p.purchase_date = today - INTERVAL '12 days'
  ON CONFLICT DO NOTHING;

  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Chiniguta Fish', 1, 'kg', 22000, 'fish'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_2 AND p.purchase_date = today - INTERVAL '12 days'
  ON CONFLICT DO NOTHING;

  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Turmeric Powder', 500, 'gm', 2500, 'spices'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_2 AND p.purchase_date = today - INTERVAL '12 days'
  ON CONFLICT DO NOTHING;

  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Red Chili', 500, 'gm', 4000, 'spices'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_2 AND p.purchase_date = today - INTERVAL '12 days'
  ON CONFLICT DO NOTHING;

  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Salt', 1, 'kg', 1200, 'spices'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_2 AND p.purchase_date = today - INTERVAL '12 days'
  ON CONFLICT DO NOTHING;

  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  SELECT p.id, 'Sugar', 2, 'kg', 7000, 'grocery'
  FROM bazar_purchases p
  WHERE p.mess_id = mess_1_id AND p.buyer_id = demo_user_2 AND p.purchase_date = today - INTERVAL '12 days'
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Mess Expenses for Mess #1
  -- ============================================================
  INSERT INTO mess_expenses (mess_id, paid_by, category, amount, expense_date, description, is_shared)
  VALUES
    (mess_1_id, demo_user_1, 'rent', 800000, today - INTERVAL '28 days', 'Monthly rent - House 12, Road 5', true),
    (mess_1_id, demo_user_2, 'gas', 8500, today - INTERVAL '27 days', 'Gas cylinder refill', true),
    (mess_1_id, demo_user_3, 'electricity', 12500, today - INTERVAL '20 days', 'DESCO bill', true),
    (mess_1_id, demo_user_1, 'water', 4000, today - INTERVAL '15 days', 'Water bill quarterly', true),
    (mess_1_id, demo_user_4, 'wifi', 15000, today - INTERVAL '10 days', 'Internet - September', true),
    (mess_1_id, demo_user_1, 'cleaning', 3000, today - INTERVAL '5 days', 'Cleaning supplies', true),
    (mess_1_id, demo_user_2, 'maintenance', 5000, today - INTERVAL '3 days', 'Plumber visit - bathroom leak', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Mess Payments for Mess #1
  -- ============================================================
  INSERT INTO mess_payments (mess_id, member_id, amount, payment_date, payment_method, reference, status, confirmed_by, confirmed_at, recorded_by)
  VALUES
    (mess_1_id, demo_user_2, 350000, today - INTERVAL '20 days', 'mobile_banking', 'bKash TXN-88421', 'confirmed', demo_user_1, today - INTERVAL '20 days', demo_user_2),
    (mess_1_id, demo_user_3, 350000, today - INTERVAL '18 days', 'bank', 'DBBL AC-7729182', 'confirmed', demo_user_1, today - INTERVAL '18 days', demo_user_3),
    (mess_1_id, demo_user_4, 350000, today - INTERVAL '15 days', 'cash', 'Hand cash', 'confirmed', demo_user_1, today - INTERVAL '15 days', demo_user_4),
    (mess_1_id, demo_user_2, 50000, today - INTERVAL '5 days', 'mobile_banking', 'bKash TXN-99104', 'pending', NULL, NULL, demo_user_2)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Bazar Exchange Request (pending)
  -- ============================================================
  INSERT INTO bazar_exchange_requests (
    mess_id, requester_id, requester_duty_id, requester_duty_date,
    target_id, target_duty_id, target_duty_date,
    status, requester_original_duty_date, target_original_duty_date
  )
  SELECT
    mess_1_id,
    demo_user_2,
    d1.id, today + INTERVAL '15 days',
    demo_user_3,
    d2.id, today + INTERVAL '22 days',
    'pending',
    today + INTERVAL '15 days',
    today + INTERVAL '22 days'
  FROM bazar_duties d1, bazar_duties d2
  WHERE d1.mess_id = mess_1_id AND d1.user_id = demo_user_2 AND d1.duty_date = today + INTERVAL '15 days'
    AND d2.mess_id = mess_1_id AND d2.user_id = demo_user_3 AND d2.duty_date = today + INTERVAL '22 days'
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Mess Announcements for Mess #1
  -- ============================================================
  INSERT INTO mess_announcements (mess_id, title, content, is_active, created_by)
  VALUES
    (mess_1_id, 'Monthly Meeting', 'Reminder: Monthly mess meeting on the 5th at 9 PM. Attendance mandatory for all active members.', true, demo_user_1),
    (mess_1_id, 'Bazar Rate Increased', 'Due to recent price hikes, bazar contribution for this month has been increased to 3500 BDT. Please pay by the 10th.', true, demo_user_1)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Audit Logs for Mess #1
  -- ============================================================
  INSERT INTO mess_audit_logs (mess_id, actor_id, actor_name, action, entity_type, entity_id, description)
  VALUES
    (mess_1_id, demo_user_1, 'Rahim Ahmed', 'member_joined', 'mess_member', demo_user_2, 'Karim Hassan joined the mess'),
    (mess_1_id, demo_user_1, 'Rahim Ahmed', 'member_joined', 'mess_member', demo_user_3, 'Fatema Begum joined the mess'),
    (mess_1_id, demo_user_1, 'Rahim Ahmed', 'settings_changed', 'meal_cutoff_settings', NULL, 'Updated meal cut-off times'),
    (mess_1_id, demo_user_2, 'Karim Hassan', 'bazar_entry_added', 'bazar_purchase', NULL, 'Added bazar purchase on ' || (today - INTERVAL '5 days')::text),
    (mess_1_id, demo_user_1, 'Rahim Ahmed', 'settlement_generated', 'monthly_settlement', NULL, 'Settlement generated for previous month'),
    (mess_1_id, demo_user_1, 'Rahim Ahmed', 'announcement_created', 'mess_announcement', NULL, 'Posted announcement: Monthly Meeting'),
    (mess_1_id, demo_user_2, 'Karim Hassan', 'exchange_requested', 'bazar_exchange_request', NULL, 'Requested duty exchange')
  ON CONFLICT DO NOTHING;

END $$;
