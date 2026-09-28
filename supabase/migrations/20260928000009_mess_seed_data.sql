-- ============================================================
-- Mess Management System — Seed Data
-- Migration: 20260928000009_mess_seed_data.sql
-- Creates realistic test data for development/demo
-- ============================================================

-- NOTE: This migration assumes profiles already exist in the database.
-- If running on a fresh Supabase instance, you may need to create test profiles first.
-- The seed data references existing profile IDs (user_id values).
-- Adjust the UUIDs below to match actual profiles in your database.

-- For demo purposes, we'll use placeholder profile IDs.
-- In production, replace these with actual profile IDs from your auth.users / profiles table.

DO $$
DECLARE
  -- Demo user IDs (replace with real profile IDs in production)
  demo_user_1 UUID := gen_random_uuid();
  demo_user_2 UUID := gen_random_uuid();
  demo_user_3 UUID := gen_random_uuid();
  demo_user_4 UUID := gen_random_uuid();
  demo_user_5 UUID := gen_random_uuid();

  -- Create demo profiles if they don't exist (for local dev)
  -- In Supabase, profiles are auto-created by triggers on auth.users
  -- This block is safe to run even if profiles already exist

  mess_1_id UUID;
  mess_2_id UUID;

  -- Month boundaries for September 2026
  sep_start DATE := '2026-09-01';
  sep_end DATE := '2026-09-30';
  today DATE := CURRENT_DATE;
  yesterday DATE := today - 1;

  -- Helper variables
  i INT;
  meal_date DATE;
BEGIN

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
  ON CONFLICT DO NOTHING
  RETURNING id INTO mess_1_id;

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
  ON CONFLICT DO NOTHING
  RETURNING id INTO mess_2_id;

  -- ============================================================
  -- Mess #1 Members (12 No. Bachelor Mess)
  -- ============================================================
  -- Manager (demo_user_1)
  INSERT INTO mess_members (mess_id, user_id, role, status, joined_at)
  VALUES (mess_1_id, demo_user_1, 'manager', 'active', sep_start)
  ON CONFLICT DO NOTHING;

  -- Active members
  INSERT INTO mess_members (mess_id, user_id, role, status, joined_at)
  VALUES
    (mess_1_id, demo_user_2, 'member', 'active', sep_start),
    (mess_1_id, demo_user_3, 'member', 'active', sep_start + INTERVAL '3 days'),
    (mess_1_id, demo_user_4, 'member', 'active', sep_start + INTERVAL '7 days')
  ON CONFLICT DO NOTHING;

  -- Pending member
  INSERT INTO mess_members (mess_id, user_id, role, status, joined_at)
  VALUES (mess_1_id, demo_user_5, 'member', 'pending', NULL)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Meal Cutoff Settings for Mess #1
  -- ============================================================
  INSERT INTO meal_cutoff_settings (mess_id, breakfast_cutoff_minutes, lunch_cutoff_minutes, dinner_cutoff_minutes)
  VALUES (mess_1_id, 30, 60, 120)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Bazar Duties for Mess #1 (September 2026)
  -- ============================================================
  INSERT INTO bazar_duties (mess_id, user_id, duty_date, created_by)
  VALUES
    (mess_1_id, demo_user_1, '2026-09-05', demo_user_1),
    (mess_1_id, demo_user_2, '2026-09-12', demo_user_1),
    (mess_1_id, demo_user_3, '2026-09-19', demo_user_1),
    (mess_1_id, demo_user_4, '2026-09-26', demo_user_1),
    (mess_1_id, demo_user_1, '2026-09-08', demo_user_1),
    (mess_1_id, demo_user_2, '2026-09-15', demo_user_1),
    (mess_1_id, demo_user_3, '2026-09-22', demo_user_1),
    (mess_1_id, demo_user_4, '2026-09-29', demo_user_1)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Meal Records for Mess #1 (last 7 days for demo)
  -- ============================================================
  FOR i IN 0..6 LOOP
    meal_date := today - i;

    -- demo_user_1: All meals on
    INSERT INTO meal_records (mess_id, user_id, meal_date, meal_type, state, created_by) VALUES
      (mess_1_id, demo_user_1, meal_date, 'breakfast', 'on', demo_user_1),
      (mess_1_id, demo_user_1, meal_date, 'lunch', 'on', demo_user_1),
      (mess_1_id, demo_user_1, meal_date, 'dinner', 'on', demo_user_1)
    ON CONFLICT DO NOTHING;

    -- demo_user_2: Breakfast off, rest on
    INSERT INTO meal_records (mess_id, user_id, meal_date, meal_type, state, created_by) VALUES
      (mess_1_id, demo_user_2, meal_date, 'breakfast', 'off', demo_user_2),
      (mess_1_id, demo_user_2, meal_date, 'lunch', 'on', demo_user_2),
      (mess_1_id, demo_user_2, meal_date, 'dinner', 'on', demo_user_2)
    ON CONFLICT DO NOTHING;

    -- demo_user_3: All meals on (except yesterday dinner off)
    IF meal_date != yesterday OR i != 1 THEN
      INSERT INTO meal_records (mess_id, user_id, meal_date, meal_type, state, created_by) VALUES
        (mess_1_id, demo_user_3, meal_date, 'breakfast', 'on', demo_user_3),
        (mess_1_id, demo_user_3, meal_date, 'lunch', 'on', demo_user_3),
        (mess_1_id, demo_user_3, meal_date, 'dinner', 'on', demo_user_3)
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO meal_records (mess_id, user_id, meal_date, meal_type, state, created_by) VALUES
        (mess_1_id, demo_user_3, meal_date, 'breakfast', 'on', demo_user_3),
        (mess_1_id, demo_user_3, meal_date, 'lunch', 'on', demo_user_3),
        (mess_1_id, demo_user_3, meal_date, 'dinner', 'off', demo_user_3)
      ON CONFLICT DO NOTHING;
    END IF;

    -- demo_user_4: Breakfast and dinner off
    INSERT INTO meal_records (mess_id, user_id, meal_date, meal_type, state, created_by) VALUES
      (mess_1_id, demo_user_4, meal_date, 'breakfast', 'off', demo_user_4),
      (mess_1_id, demo_user_4, meal_date, 'lunch', 'on', demo_user_4),
      (mess_1_id, demo_user_4, meal_date, 'dinner', 'off', demo_user_4)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ============================================================
  -- Bazar Purchases for Mess #1 (September 2026)
  -- ============================================================
  INSERT INTO bazar_purchases (mess_id, buyer_id, purchase_date, total_amount, notes, is_verified)
  VALUES
    (mess_1_id, demo_user_1, '2026-09-05', 245000, 'Weekly rice, dal, vegetables', true),
    (mess_1_id, demo_user_2, '2026-09-12', 320000, 'Fish market + grocery', true),
    (mess_1_id, demo_user_3, '2026-09-19', 187500, 'Vegetables and essentials', true),
    (mess_1_id, demo_user_4, '2026-09-26', 289000, 'Mixed groceries + cleaning supplies', false)
  ON CONFLICT DO NOTHING;

  -- Get purchase IDs for items
  WITH p AS (
    SELECT id, buyer_id, purchase_date FROM bazar_purchases WHERE mess_id = mess_1_id ORDER BY purchase_date
  )
  SELECT id INTO mess_1_id FROM p WHERE buyer_id = demo_user_1 AND purchase_date = '2026-09-05';

  -- Bazar Purchase Items for Sept 5 purchase
  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  VALUES
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_1 AND purchase_date = '2026-09-05' LIMIT 1), 'Premium Rice', 5, 'kg', 5500, 'rice'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_1 AND purchase_date = '2026-09-05' LIMIT 1), 'Masur Dal', 3, 'kg', 12000, 'grocery'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_1 AND purchase_date = '2026-09-05' LIMIT 1), 'Mixed Vegetables', 2.5, 'kg', 4000, 'vegetables'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_1 AND purchase_date = '2026-09-05' LIMIT 1), 'Mustard Oil', 1, 'litre', 16000, 'oil'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_1 AND purchase_date = '2026-09-05' LIMIT 1), 'Onion', 2, 'kg', 3500, 'vegetables')
  ON CONFLICT DO NOTHING;

  -- Bazar Purchase Items for Sept 12 purchase
  INSERT INTO bazar_purchase_items (purchase_id, item_name, quantity, unit, unit_price, category)
  VALUES
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_2 AND purchase_date = '2026-09-12' LIMIT 1), 'Hilsha Fish', 1.5, 'kg', 85000, 'fish'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_2 AND purchase_date = '2026-09-12' LIMIT 1), 'Rui Fish', 2, 'kg', 40000, 'fish'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_2 AND purchase_date = '2026-09-12' LIMIT 1), 'Chiniguta Fish', 1, 'kg', 22000, 'fish'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_2 AND purchase_date = '2026-09-12' LIMIT 1), 'Turmeric Powder', 500, 'gm', 2500, 'spices'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_2 AND purchase_date = '2026-09-12' LIMIT 1), 'Red Chili', 500, 'gm', 4000, 'spices'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_2 AND purchase_date = '2026-09-12' LIMIT 1), 'Salt', 1, 'kg', 1200, 'spices'),
    ((SELECT id FROM bazar_purchases WHERE mess_id = mess_1_id AND buyer_id = demo_user_2 AND purchase_date = '2026-09-12' LIMIT 1), 'Sugar', 2, 'kg', 7000, 'grocery')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Mess Expenses for Mess #1 (September 2026)
  -- ============================================================
  INSERT INTO mess_expenses (mess_id, paid_by, category, amount, expense_date, description, is_shared)
  VALUES
    (mess_1_id, demo_user_1, 'rent', 800000, '2026-09-01', 'September rent - House 12, Road 5', true),
    (mess_1_id, demo_user_2, 'gas', 8500, '2026-09-03', 'Gas cylinder refill', true),
    (mess_1_id, demo_user_3, 'electricity', 12500, '2026-09-10', 'DESCO bill - September', true),
    (mess_1_id, demo_user_1, 'water', 4000, '2026-09-15', 'Water bill quarterly', true),
    (mess_1_id, demo_user_4, 'wifi', 15000, '2026-09-20', 'Internet - September', true),
    (mess_1_id, demo_user_1, 'cleaning', 3000, '2026-09-25', 'Cleaning supplies', true),
    (mess_1_id, demo_user_2, 'maintenance', 5000, '2026-09-27', 'Plumber visit - bathroom leak', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Mess Payments for Mess #1 (September 2026)
  -- ============================================================
  INSERT INTO mess_payments (mess_id, member_id, amount, payment_date, payment_method, reference, status, confirmed_by, confirmed_at, recorded_by)
  VALUES
    (mess_1_id, demo_user_2, 350000, '2026-09-10', 'mobile_banking', 'bKash TXN-88421', 'confirmed', demo_user_1, '2026-09-10', demo_user_2),
    (mess_1_id, demo_user_3, 350000, '2026-09-12', 'bank', 'DBBL AC-7729182', 'confirmed', demo_user_1, '2026-09-12', demo_user_3),
    (mess_1_id, demo_user_4, 350000, '2026-09-15', 'cash', 'Hand cash', 'confirmed', demo_user_1, '2026-09-15', demo_user_4),
    (mess_1_id, demo_user_2, 50000, '2026-09-25', 'mobile_banking', 'bKash TXN-99104', 'pending', NULL, NULL, demo_user_2)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Bazar Exchange Request (pending)
  -- ============================================================
  -- demo_user_2 wants to swap their Sept 15 duty with demo_user_3's Sept 22 duty
  INSERT INTO bazar_exchange_requests (
    mess_id, requester_id, requester_duty_id, requester_duty_date,
    target_id, target_duty_id, target_duty_date,
    status, requester_original_duty_date, target_original_duty_date
  )
  VALUES (
    mess_1_id,
    demo_user_2,
    (SELECT id FROM bazar_duties WHERE mess_id = mess_1_id AND user_id = demo_user_2 AND duty_date = '2026-09-15' LIMIT 1),
    '2026-09-15',
    demo_user_3,
    (SELECT id FROM bazar_duties WHERE mess_id = mess_1_id AND user_id = demo_user_3 AND duty_date = '2026-09-22' LIMIT 1),
    '2026-09-22',
    'pending',
    '2026-09-15',
    '2026-09-22'
  )
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Mess Announcements for Mess #1
  -- ============================================================
  INSERT INTO mess_announcements (mess_id, title, content, is_active, created_by)
  VALUES
    (mess_1_id, 'Monthly Meeting', 'Reminder: Monthly mess meeting on 5th September at 9 PM. Attendance mandatory for all active members.', true, demo_user_1),
    (mess_1_id, 'Bazar Rate Increased', 'Due to recent price hikes, bazar contribution for this month has been increased to 3500 BDT. Please pay by 10th.', true, demo_user_1)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- Audit Logs for Mess #1 (sample)
  -- ============================================================
  INSERT INTO mess_audit_logs (mess_id, actor_id, actor_name, action, entity_type, entity_id, description)
  VALUES
    (mess_1_id, demo_user_1, 'Manager', 'member_joined', 'mess_member', demo_user_2, 'Rahim joined the mess'),
    (mess_1_id, demo_user_1, 'Manager', 'member_joined', 'mess_member', demo_user_3, 'Karim joined the mess'),
    (mess_1_id, demo_user_1, 'Manager', 'settings_changed', 'meal_cutoff_settings', NULL, 'Updated meal cut-off times'),
    (mess_1_id, demo_user_2, 'Member', 'bazar_entry_added', 'bazar_purchase', NULL, 'Added bazar purchase on 2026-09-05'),
    (mess_1_id, demo_user_1, 'Manager', 'settlement_generated', 'monthly_settlement', NULL, 'Settlement generated for August 2026'),
    (mess_1_id, demo_user_1, 'Manager', 'announcement_created', 'mess_announcement', NULL, 'Posted announcement: Monthly Meeting'),
    (mess_1_id, demo_user_2, 'Member', 'exchange_requested', 'bazar_exchange_request', NULL, 'Requested duty exchange for Sept 15')
  ON CONFLICT DO NOTHING;

END $$;

COMMENT ON MIGRATION 20260928000009_mess_seed_data IS 'Seed data for mess management testing: 2 messes, members, meal records, bazar purchases, expenses, payments, announcements, audit logs.';
