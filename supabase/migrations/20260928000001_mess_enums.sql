-- ============================================================
-- Mess Management System — Enums & Helpers
-- Migration: 20260928000001_mess_enums.sql
-- ============================================================

-- Member status within a mess
CREATE TYPE mess_member_status AS ENUM (
  'pending',
  'active',
  'left',
  'removed'
);

-- Role within a mess
CREATE TYPE mess_role AS ENUM (
  'member',
  'manager'
);

-- Meal types
CREATE TYPE meal_type AS ENUM (
  'breakfast',
  'lunch',
  'dinner'
);

-- Meal state (ON/OFF)
CREATE TYPE meal_state AS ENUM (
  'on',
  'off'
);

-- Expense categories (default list — manager can extend)
CREATE TYPE mess_expense_category AS ENUM (
  'rent',
  'gas',
  'electricity',
  'water',
  'wifi',
  'cleaning',
  'maintenance',
  'furniture',
  'other'
);

-- Bazar purchase categories (default list — manager can extend)
CREATE TYPE bazar_category AS ENUM (
  'rice',
  'fish',
  'meat',
  'vegetables',
  'grocery',
  'oil',
  'spices',
  'eggs',
  'milk',
  'snacks',
  'cleaning',
  'other'
);

-- Payment methods
CREATE TYPE payment_method AS ENUM (
  'cash',
  'bank',
  'mobile_banking',
  'other'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'confirmed',
  'rejected'
);

-- Exchange request status
CREATE TYPE exchange_status AS ENUM (
  'pending',
  'accepted',
  'rejected'
);

-- Settlement status
CREATE TYPE settlement_status AS ENUM (
  'draft',
  'published',
  'locked'
);

-- Audit log action types
CREATE TYPE mess_audit_action AS ENUM (
  'member_joined',
  'member_accepted',
  'member_rejected',
  'member_left',
  'member_removed',
  'meal_modified_after_cutoff',
  'meal_locked',
  'bazar_entry_added',
  'bazar_entry_modified',
  'bazar_entry_deleted',
  'expense_added',
  'expense_modified',
  'expense_deleted',
  'payment_recorded',
  'payment_confirmed',
  'payment_rejected',
  'exchange_requested',
  'exchange_accepted',
  'exchange_rejected',
  'exchange_override',
  'settlement_generated',
  'settlement_published',
  'settlement_locked',
  'settlement_corrected',
  'settings_changed',
  'duty_schedule_changed',
  'announcement_created',
  'announcement_updated',
  'announcement_deleted'
);

-- ============================================================
-- Helper functions
-- ============================================================

-- Generate a unique mess code: KSE-MESS-XXXX
CREATE OR REPLACE FUNCTION generate_mess_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'KSE-MESS-';
  i INT;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * 36)::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Get the start of today in Asia/Dhaka timezone (midnight)
CREATE OR REPLACE FUNCTION dhaka_date()
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (CURRENT_DATE AT TIME ZONE 'Asia/Dhaka')::DATE;
END;
$$;

-- Get current timestamp in Asia/Dhaka
CREATE OR REPLACE FUNCTION dhaka_now()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka';
END;
$$;

-- Convert a UTC timestamp to Asia/Dhaka
CREATE OR REPLACE FUNCTION to_dhaka(ts TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN ts AT TIME ZONE 'Asia/Dhaka';
END;
$$;

-- Convert a Asia/Dhaka timestamp to UTC
CREATE OR REPLACE FUNCTION to_utc(ts TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN ts AT TIME ZONE 'UTC';
END;
$$;

-- Get the month start for a given date in Asia/Dhaka
CREATE OR REPLACE FUNCTION get_mess_month_start(ref_date DATE)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN date_trunc('month', ref_date AT TIME ZONE 'Asia/Dhaka')::DATE;
END;
$$;

-- Get the month end for a given date in Asia/Dhaka
CREATE OR REPLACE FUNCTION get_mess_month_end(ref_date DATE)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (date_trunc('month', ref_date AT TIME ZONE 'Asia/Dhaka') + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
END;
$$;

-- Check if a datetime is before the meal cut-off for a given meal type
-- cut_off_minutes: minutes before meal time (e.g., 30 means cut-off is 30 min before)
CREATE OR REPLACE FUNCTION is_meal_cutoff_passed(
  meal_date DATE,
  meal_type_val meal_type,
  cut_off_minutes INT,
  check_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  dhaka_now TIMESTAMPTZ;
  meal_datetime TIMESTAMPTZ;
  cut_off_datetime TIMESTAMPTZ;
BEGIN
  dhaka_now := check_at AT TIME ZONE 'Asia/Dhaka';

  -- Calculate meal datetime for the given date
  -- Default meal times: breakfast 08:00, lunch 13:00, dinner 20:00
  IF meal_type_val = 'breakfast' THEN
    meal_datetime := (meal_date || ' 08:00:00')::TIMESTAMPTZ AT TIME ZONE 'Asia/Dhaka';
  ELSIF meal_type_val = 'lunch' THEN
    meal_datetime := (meal_date || ' 13:00:00')::TIMESTAMPTZ AT TIME ZONE 'Asia/Dhaka';
  ELSE
    meal_datetime := (meal_date || ' 20:00:00')::TIMESTAMPTZ AT TIME ZONE 'Asia/Dhaka';
  END IF;

  cut_off_datetime := meal_datetime - (cut_off_minutes || ' minutes')::INTERVAL;

  RETURN dhaka_now > cut_off_datetime;
END;
$$;

-- Generate a unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * 36)::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Secure comparison for strings (constant-time)
CREATE OR REPLACE FUNCTION secure_compare(a TEXT, b TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN a = b;
END;
$$;

COMMENT ON FUNCTION generate_mess_code IS 'Generates a unique mess code like KSE-MESS-8F42';
COMMENT ON FUNCTION dhaka_date IS 'Returns current date in Asia/Dhaka timezone';
COMMENT ON FUNCTION dhaka_now IS 'Returns current timestamp in Asia/Dhaka timezone';
COMMENT ON FUNCTION to_dhaka IS 'Converts UTC timestamp to Asia/Dhaka';
COMMENT ON FUNCTION to_utc IS 'Converts Asia/Dhaka timestamp to UTC';
COMMENT ON FUNCTION get_mess_month_start IS 'Returns the first day of the month for a reference date in Dhaka timezone';
COMMENT ON FUNCTION get_mess_month_end IS 'Returns the last day of the month for a reference date in Dhaka timezone';
COMMENT ON FUNCTION is_meal_cutoff_passed IS 'Checks if the meal cut-off time has passed for a given meal';
COMMENT ON FUNCTION generate_invite_code IS 'Generates an 8-character uppercase alphanumeric invite code';
