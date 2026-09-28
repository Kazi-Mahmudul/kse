-- ============================================================
-- Add member_count column to messes table
-- Migration: 20260928000010_mess_member_count.sql
-- Maintains an active member count on the messes table itself,
-- avoiding ambiguous aggregate queries in PostgREST joins.
-- ============================================================

-- Add member_count column with a trigger to keep it in sync
ALTER TABLE messes ADD COLUMN member_count INT NOT NULL DEFAULT 0;

-- Backfill existing messes
UPDATE messes m
SET member_count = (
  SELECT COUNT(*) FROM mess_members
  WHERE mess_id = m.id AND status = 'active'
);

-- Trigger function to auto-update member_count on member changes
CREATE OR REPLACE FUNCTION update_mess_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE messes SET member_count = member_count + 1
    WHERE id = NEW.mess_id AND NEW.status = 'active';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE messes SET member_count = member_count - 1
    WHERE id = OLD.mess_id AND OLD.status = 'active';
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status change: active->inactive or inactive->active
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE messes SET member_count = member_count - 1 WHERE id = NEW.mess_id;
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE messes SET member_count = member_count + 1 WHERE id = NEW.mess_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fire trigger on mess_members for insert, update, delete
CREATE TRIGGER trg_mess_member_count
AFTER INSERT OR UPDATE OR DELETE ON mess_members
FOR EACH ROW EXECUTE FUNCTION update_mess_member_count();

-- RLS: member_count is readable by everyone who can see the mess
-- (messes RLS policies already allow this)
