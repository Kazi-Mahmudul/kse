-- ============================================================
-- Mess Management System — Meal Tables
-- Migration: 20260928000003_mess_meals.sql
-- Tables: meal_cutoff_settings, meal_records
-- ============================================================

-- ============================================================
-- Table: meal_cutoff_settings
-- Per-mess configurable cut-off times for each meal type
-- ============================================================
CREATE TABLE meal_cutoff_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL UNIQUE REFERENCES messes(id) ON DELETE CASCADE,

  -- Cut-off before meal time in MINUTES (e.g., 1440 = previous day same time)
  -- Breakfast: default 30 min before (prev day 10pm = 30 min before 8am meal? No, let's use clearer logic)
  -- Actually store as "minutes before meal time" per meal type:
  breakfast_cutoff_minutes INT NOT NULL DEFAULT 30,   -- 30 min before breakfast (8am = 7:30am cut-off)
  lunch_cutoff_minutes INT NOT NULL DEFAULT 60,       -- 60 min before lunch (1pm = 12pm cut-off)
  dinner_cutoff_minutes INT NOT NULL DEFAULT 120,      -- 120 min before dinner (8pm = 6pm cut-off)

  -- Alternative: cut-off time in Dhaka timezone for each meal
  -- If set, overrides the minutes-based calculation
  breakfast_cutoff_time TIME,  -- e.g., '22:00' for previous day 10pm
  lunch_cutoff_time TIME,
  dinner_cutoff_time TIME,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_cutoff_mess ON meal_cutoff_settings(mess_id);

-- ============================================================
-- Table: meal_records
-- Daily meal ON/OFF records per member
-- ============================================================
CREATE TABLE meal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,  -- In Asia/Dhaka timezone
  meal_type meal_type NOT NULL,
  state meal_state NOT NULL DEFAULT 'off',

  -- Who made the change and when
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Unique: one record per member per meal per day
  UNIQUE (mess_id, user_id, meal_date, meal_type)
);

CREATE INDEX idx_meal_records_mess_date ON meal_records(mess_id, meal_date);
CREATE INDEX idx_meal_records_user_date ON meal_records(user_id, meal_date);
CREATE INDEX idx_meal_records_mess_user ON meal_records(mess_id, user_id);
CREATE INDEX idx_meal_records_mess_month ON meal_records(mess_id, meal_date);

-- ============================================================
-- Trigger: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_meal_cutoff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meal_cutoff_updated_at
  BEFORE UPDATE ON meal_cutoff_settings
  FOR EACH ROW EXECUTE FUNCTION update_meal_cutoff_updated_at();

CREATE OR REPLACE FUNCTION update_meal_record_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meal_record_updated_at
  BEFORE UPDATE ON meal_records
  FOR EACH ROW EXECUTE FUNCTION update_meal_record_updated_at();

-- ============================================================
-- Helper: get meal cut-off settings for a mess
-- ============================================================
CREATE OR REPLACE FUNCTION get_meal_cutoff(mess_uuid UUID, m_type meal_type)
RETURNS TABLE (cutoff_minutes INT, cutoff_time TIME)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE m_type
      WHEN 'breakfast' THEN s.breakfast_cutoff_minutes
      WHEN 'lunch' THEN s.lunch_cutoff_minutes
      WHEN 'dinner' THEN s.dinner_cutoff_minutes
    END AS cutoff_minutes,
    CASE m_type
      WHEN 'breakfast' THEN s.breakfast_cutoff_time
      WHEN 'lunch' THEN s.lunch_cutoff_time
      WHEN 'dinner' THEN s.dinner_cutoff_time
    END AS cutoff_time
  FROM meal_cutoff_settings s
  WHERE s.mess_id = mess_uuid;
END;
$$;

-- ============================================================
-- Helper: check if a meal can still be modified
-- Uses both minutes-based and time-based cut-off logic
-- ============================================================
CREATE OR REPLACE FUNCTION can_modify_meal(
  mess_uuid UUID,
  member_uuid UUID,
  meal_date_val DATE,
  m_type meal_type,
  check_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_member BOOLEAN;
  cutoff_rec RECORD;
  dhaka_ts TIMESTAMPTZ;
  meal_dt TIMESTAMPTZ;
  cutoff_dt TIMESTAMPTZ;
BEGIN
  -- Only active members can modify their own meals
  SELECT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = mess_uuid AND user_id = member_uuid AND status = 'active'
  ) INTO is_member;

  IF NOT is_member THEN
    RETURN false;
  END IF;

  -- Get cut-off settings
  SELECT * INTO cutoff_rec FROM get_meal_cutoff(mess_uuid, m_type);

  -- If no cut-off settings exist, use a permissive default
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  dhaka_ts := check_at AT TIME ZONE 'Asia/Dhaka';

  -- Calculate meal datetime
  IF m_type = 'breakfast' THEN
    meal_dt := (meal_date_val || ' 08:00:00')::TIMESTAMPTZ AT TIME ZONE 'Asia/Dhaka';
  ELSIF m_type = 'lunch' THEN
    meal_dt := (meal_date_val || ' 13:00:00')::TIMESTAMPTZ AT TIME ZONE 'Asia/Dhaka';
  ELSE
    meal_dt := (meal_date_val || ' 20:00:00')::TIMESTAMPTZ AT TIME ZONE 'Asia/Dhaka';
  END IF;

  -- If a specific cut-off TIME is set, use that
  IF cutoff_rec.cutoff_time IS NOT NULL THEN
    -- The cut-off time is in Dhaka timezone
    -- For breakfast, cut-off is typically previous day
    IF m_type = 'breakfast' THEN
      cutoff_dt := ((meal_date_val - 1) || ' ' || cutoff_rec.cutoff_time)::TIMESTAMPTZ AT TIME ZONE 'Asia/Dhaka';
    ELSE
      cutoff_dt := (meal_date_val || ' ' || cutoff_rec.cutoff_time)::TIMESTAMPTZ AT TIME ZONE 'Asia/Dhaka';
    END IF;
  ELSE
    -- Use minutes-based cut-off
    cutoff_dt := meal_dt - (cutoff_rec.cutoff_minutes || ' minutes')::INTERVAL;
  END IF;

  RETURN dhaka_ts < cutoff_dt;
END;
$$;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE meal_cutoff_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_records ENABLE ROW LEVEL SECURITY;

-- Meal cutoff settings: members can read, managers can write
CREATE POLICY "meal_cutoff_select"
  ON meal_cutoff_settings FOR SELECT
  USING (is_mess_manager_or_member(mess_id) = true);

CREATE POLICY "meal_cutoff_insert_manager"
  ON meal_cutoff_settings FOR INSERT
  WITH CHECK (is_mess_manager(mess_id) = true);

CREATE POLICY "meal_cutoff_update_manager"
  ON meal_cutoff_settings FOR UPDATE
  USING (is_mess_manager(mess_id) = true);

-- Meal records: active members can read mess meals, manage their own
CREATE POLICY "meal_records_select"
  ON meal_records FOR SELECT
  USING (
    is_mess_member(mess_id) = true
    OR is_mess_manager(mess_id) = true
  );

-- Members can insert/update their own meal records
CREATE POLICY "meal_records_insert"
  ON meal_records FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_mess_member(mess_id) = true
  );

-- Members can update their own meal records (before cut-off enforced in app logic)
-- Note: the can_modify_meal() function should be called in the service/edge function
CREATE POLICY "meal_records_update"
  ON meal_records FOR UPDATE
  USING (
    auth.uid() = user_id
    AND is_mess_member(mess_id) = true
  );

-- Managers can update any meal record in their mess (for corrections)
CREATE POLICY "meal_records_update_manager"
  ON meal_records FOR UPDATE
  USING (is_mess_manager(mess_id) = true);

COMMENT ON TABLE meal_cutoff_settings IS 'Per-mess configurable meal cut-off times (minutes before meal or specific time).';
COMMENT ON TABLE meal_records IS 'Daily meal ON/OFF records per member. One record per member per meal per day.';
