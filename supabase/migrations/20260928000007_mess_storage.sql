-- ============================================================
-- Mess Management System — Storage
-- Migration: 20260928000007_mess_storage.sql
-- Bucket: bazar-receipts
-- ============================================================

-- Storage bucket for bazar purchase receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bazar-receipts',
  'bazar-receipts',
  false,  -- Private bucket
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for bazar-receipts bucket
-- Note: storage.objects RLS is managed by Supabase; we only add policies for our bucket

-- Helper: check if user is a member of the mess that owns the receipt
CREATE OR REPLACE FUNCTION is_bazar_receipt_owner(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mess_id UUID;
  v_is_member BOOLEAN;
BEGIN
  -- Object name format: {mess_id}/{user_id}/{filename}
  -- e.g., abc123/def456/receipt.jpg
  v_mess_id := split_part(object_name, '/', 1)::UUID;

  SELECT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = v_mess_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) INTO v_is_member;

  RETURN COALESCE(v_is_member, false);
END;
$$;

-- Helper: check if user is a manager of the mess that owns the receipt
CREATE OR REPLACE FUNCTION is_bazar_receipt_manager(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mess_id UUID;
  v_is_manager BOOLEAN;
BEGIN
  v_mess_id := split_part(object_name, '/', 1)::UUID;

  SELECT EXISTS (
    SELECT 1 FROM messes
    WHERE id = v_mess_id
      AND manager_id = auth.uid()
  ) INTO v_is_manager;

  RETURN COALESCE(v_is_manager, false);
END;
$$;

-- Anyone with mess membership can upload receipts for their own purchases
CREATE POLICY "bazar_receipts_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bazar-receipts'
    AND is_bazar_receipt_owner(name) = true
  );

-- Members can view receipts in their mess
CREATE POLICY "bazar_receipts_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bazar-receipts'
    AND (
      is_bazar_receipt_owner(name) = true
      OR is_bazar_receipt_manager(name) = true
    )
  );

-- Members can delete their own receipts
CREATE POLICY "bazar_receipts_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bazar-receipts'
    AND is_bazar_receipt_owner(name) = true
  );

-- Managers can delete any receipt in their mess
CREATE POLICY "bazar_receipts_delete_manager"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bazar-receipts'
    AND is_bazar_receipt_manager(name) = true
  );

