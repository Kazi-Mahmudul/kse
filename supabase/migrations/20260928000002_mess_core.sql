-- ============================================================
-- Mess Management System — Core Tables
-- Migration: 20260928000002_mess_core.sql
-- Tables: messes, mess_members, mess_invites
-- ============================================================

-- ============================================================
-- Table: messes
-- ============================================================
CREATE TABLE messes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT generate_mess_code(),
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  description TEXT,
  max_members INT NOT NULL DEFAULT 10 CHECK (max_members >= 2 AND max_members <= 50),
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Unique code index
CREATE UNIQUE INDEX idx_messes_code ON messes(code);

-- Manager lookup
CREATE INDEX idx_messes_manager ON messes(manager_id);

-- ============================================================
-- Table: mess_members
-- ============================================================
CREATE TABLE mess_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role mess_role NOT NULL DEFAULT 'member',
  status mess_member_status NOT NULL DEFAULT 'pending',
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One membership per user per mess
  UNIQUE (mess_id, user_id)
);

CREATE INDEX idx_mess_members_mess ON mess_members(mess_id);
CREATE INDEX idx_mess_members_user ON mess_members(user_id);
CREATE INDEX idx_mess_members_status ON mess_members(mess_id, status);

-- ============================================================
-- Table: mess_invites
-- ============================================================
CREATE TABLE mess_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL DEFAULT generate_invite_code(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  invited_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- null = open invite
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  max_uses INT DEFAULT 1 CHECK (max_uses >= 1),
  use_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mess_invites_mess ON mess_invites(mess_id);
CREATE INDEX idx_mess_invites_code ON mess_invites(invite_code);
CREATE INDEX idx_mess_invites_expires ON mess_invites(expires_at) WHERE is_active = true;

-- ============================================================
-- Trigger: updated_at for messes
-- ============================================================
CREATE OR REPLACE FUNCTION update_mess_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mess_updated_at
  BEFORE UPDATE ON messes
  FOR EACH ROW EXECUTE FUNCTION update_mess_updated_at();

-- ============================================================
-- Trigger: updated_at for mess_members
-- ============================================================
CREATE OR REPLACE FUNCTION update_mess_member_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mess_member_updated_at
  BEFORE UPDATE ON mess_members
  FOR EACH ROW EXECUTE FUNCTION update_mess_member_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE messes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_invites ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a manager of the mess
CREATE OR REPLACE FUNCTION is_mess_manager(mess_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM messes
    WHERE id = mess_uuid
      AND manager_id = auth.uid()
  );
$$;

-- Helper: is current user a member of the mess (active)
CREATE OR REPLACE FUNCTION is_mess_member(mess_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = mess_uuid
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Helper: is current user the manager OR an active member
CREATE OR REPLACE FUNCTION is_mess_manager_or_member(mess_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = mess_uuid
      AND user_id = auth.uid()
      AND status IN ('active', 'pending')
  );
$$;

-- ============================================================
-- messes RLS
-- ============================================================
-- Anyone can view published mess details (name, location) — useful for discovery
CREATE POLICY "messes_select_public"
  ON messes FOR SELECT
  USING (is_active = true);

-- Users can create a mess
CREATE POLICY "messes_insert"
  ON messes FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

-- Only the mess manager can update mess details
CREATE POLICY "messes_update_manager"
  ON messes FOR UPDATE
  USING (is_mess_manager(id) = true);

-- Managers can delete their own inactive messes (soft-delete preferred)
CREATE POLICY "messes_delete_manager"
  ON messes FOR DELETE
  USING (is_mess_manager(id) = true);

-- ============================================================
-- mess_members RLS
-- ============================================================
-- Active members can view all members of their mess
CREATE POLICY "mess_members_select_member"
  ON mess_members FOR SELECT
  USING (
    is_mess_member(mess_id) = true
    OR is_mess_manager(mess_id) = true
  );

-- Authenticated users can create a membership request
CREATE POLICY "mess_members_insert"
  ON mess_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Managers can update member status (accept/reject/remove)
CREATE POLICY "mess_members_update_manager"
  ON mess_members FOR UPDATE
  USING (is_mess_manager(mess_id) = true);

-- Members can update their own membership (e.g., leave)
CREATE POLICY "mess_members_update_self"
  ON mess_members FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- mess_invites RLS
-- ============================================================
-- Active members can view invites for their mess
CREATE POLICY "mess_invites_select_member"
  ON mess_invites FOR SELECT
  USING (is_mess_manager_or_member(mess_id) = true);

-- Managers can create invites
CREATE POLICY "mess_invites_insert_manager"
  ON mess_invites FOR INSERT
  WITH CHECK (is_mess_manager(mess_id) = true);

-- Managers can update/inactivate invites
CREATE POLICY "mess_invites_update_manager"
  ON mess_invites FOR UPDATE
  USING (is_mess_manager(mess_id) = true);

COMMENT ON TABLE messes IS 'Student mess groups. Creator becomes manager on creation.';
COMMENT ON TABLE mess_members IS 'Membership records linking users to messes with roles and statuses.';
COMMENT ON TABLE mess_invites IS 'Invitation codes and links for joining a mess.';
