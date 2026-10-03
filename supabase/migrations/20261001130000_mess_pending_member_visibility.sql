-- ============================================================
-- Mess — pending members must see their own membership row
-- Migration: 20261001130000_mess_pending_member_visibility.sql
--
-- Bug (found in E2E QA): mess_members_select_member required an ACTIVE
-- membership, so a user whose join request was still pending could not
-- read their own row — the app showed "No mess yet" instead of
-- "Waiting for manager approval". Members can always see their own
-- membership row regardless of status; seeing other members still
-- requires being an active member or the manager.
-- ============================================================

DROP POLICY IF EXISTS "mess_members_select_member" ON mess_members;
CREATE POLICY "mess_members_select_member"
  ON mess_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_mess_member(mess_id) = true
    OR is_mess_manager(mess_id) = true
  );
