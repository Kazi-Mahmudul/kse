-- ============================================================
-- Mess Management System — Support Tables
-- Migration: 20260928000006_mess_support.sql
-- Tables: mess_announcements, mess_audit_logs
-- ============================================================

-- ============================================================
-- Table: mess_announcements
-- Manager announcements for a mess
-- ============================================================
CREATE TABLE mess_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,  -- Optional expiry
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_mess_announcements_mess ON mess_announcements(mess_id, is_active);
CREATE INDEX idx_mess_announcements_active ON mess_announcements(mess_id, is_active)
  WHERE is_active = true;

-- ============================================================
-- Table: mess_audit_logs
-- Immutable audit trail for important mess actions
-- ============================================================
CREATE TABLE mess_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,

  -- Who did it
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_name TEXT,  -- Snapshot of actor name at time of action

  -- What action
  action mess_audit_action NOT NULL,

  -- On what entity
  entity_type TEXT NOT NULL,  -- e.g., 'meal_record', 'bazar_purchase', 'mess_member'
  entity_id UUID,  -- The affected record

  -- Details
  description TEXT NOT NULL,  -- Human-readable description

  -- Value snapshots (JSON for flexibility)
  old_values JSONB,  -- Previous state snapshot
  new_values JSONB,   -- New state snapshot

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mess_audit_logs_mess ON mess_audit_logs(mess_id, created_at DESC);
CREATE INDEX idx_mess_audit_logs_actor ON mess_audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_mess_audit_logs_entity ON mess_audit_logs(entity_type, entity_id);
CREATE INDEX idx_mess_audit_logs_action ON mess_audit_logs(mess_id, action);

-- ============================================================
-- Triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_mess_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mess_announcement_updated_at
  BEFORE UPDATE ON mess_announcements
  FOR EACH ROW EXECUTE FUNCTION update_mess_announcement_updated_at();

-- ============================================================
-- Helper: log a mess action
-- ============================================================
CREATE OR REPLACE FUNCTION log_mess_action(
  p_mess_id UUID,
  p_actor_id UUID,
  p_action mess_audit_action,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_description TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_name TEXT;
  v_log_id UUID;
BEGIN
  -- Get actor name snapshot
  SELECT full_name INTO v_actor_name
  FROM profiles
  WHERE id = p_actor_id;

  INSERT INTO mess_audit_logs (
    mess_id, actor_id, actor_name, action,
    entity_type, entity_id, description,
    old_values, new_values
  ) VALUES (
    p_mess_id, p_actor_id, v_actor_name, p_action,
    p_entity_type, p_entity_id, p_description,
    p_old_values, p_new_values
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE mess_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_audit_logs ENABLE ROW LEVEL SECURITY;

-- mess_announcements: active members can read, managers can write
CREATE POLICY "mess_announcements_select"
  ON mess_announcements FOR SELECT
  USING (
    is_mess_member(mess_id) = true
    OR is_mess_manager(mess_id) = true
  );

CREATE POLICY "mess_announcements_insert"
  ON mess_announcements FOR INSERT
  WITH CHECK (is_mess_manager(mess_id) = true);

CREATE POLICY "mess_announcements_update"
  ON mess_announcements FOR UPDATE
  USING (is_mess_manager(mess_id) = true);

CREATE POLICY "mess_announcements_delete"
  ON mess_announcements FOR DELETE
  USING (is_mess_manager(mess_id) = true);

-- mess_audit_logs: members can read, managers can read all, no one can modify
CREATE POLICY "mess_audit_logs_select"
  ON mess_audit_logs FOR SELECT
  USING (
    is_mess_member(mess_id) = true
    OR is_mess_manager(mess_id) = true
  );

-- Audit logs are immutable — no INSERT/UPDATE/DELETE policies

COMMENT ON TABLE mess_announcements IS 'Manager announcements for a mess. Can expire.';
COMMENT ON TABLE mess_audit_logs IS 'Immutable audit trail. No UPDATE or DELETE allowed.';
