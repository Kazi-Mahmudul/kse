-- ============================================================
-- Mess Management System — Bazaar Tables
-- Migration: 20260928000004_mess_bazar.sql
-- Tables: bazar_duties, bazar_exchange_requests,
--         bazar_purchases, bazar_purchase_items
-- ============================================================

-- ============================================================
-- Table: bazar_duties
-- Monthly bazar duty schedule per mess
-- ============================================================
CREATE TABLE bazar_duties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duty_date DATE NOT NULL,  -- In Asia/Dhaka timezone
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- One duty per member per date
  UNIQUE (mess_id, user_id, duty_date)
);

CREATE INDEX idx_bazar_duties_mess_date ON bazar_duties(mess_id, duty_date);
CREATE INDEX idx_bazar_duties_user ON bazar_duties(user_id);

-- ============================================================
-- Table: bazar_exchange_requests
-- Immutable exchange transaction records
-- ============================================================
CREATE TABLE bazar_exchange_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,

  -- The requester and their duty
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_duty_date DATE NOT NULL,
  requester_duty_id UUID NOT NULL REFERENCES bazar_duties(id) ON DELETE RESTRICT,

  -- The target member and their duty
  target_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_duty_date DATE NOT NULL,
  target_duty_id UUID NOT NULL REFERENCES bazar_duties(id) ON DELETE RESTRICT,

  status exchange_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  response_note TEXT,

  -- Immutable: store the original assignments at time of exchange
  requester_original_duty_date DATE NOT NULL,
  target_original_duty_date DATE NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bazar_exchange_mess ON bazar_exchange_requests(mess_id);
CREATE INDEX idx_bazar_exchange_requester ON bazar_exchange_requests(requester_id);
CREATE INDEX idx_bazar_exchange_target ON bazar_exchange_requests(target_id);
CREATE INDEX idx_bazar_exchange_status ON bazar_exchange_requests(mess_id, status);

-- ============================================================
-- Table: bazar_purchases
-- A bazar shopping trip (one per buyer per date typically)
-- ============================================================
CREATE TABLE bazar_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL,  -- In Asia/Dhaka timezone
  total_amount BIGINT NOT NULL DEFAULT 0,  -- In paisa (INTEGER/BIGINT)
  notes TEXT,
  receipt_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Note: total_amount stored as BIGINT (paisa), ৳100 = 10000 paisa

CREATE INDEX idx_bazar_purchases_mess_date ON bazar_purchases(mess_id, purchase_date);
CREATE INDEX idx_bazar_purchases_buyer ON bazar_purchases(buyer_id);
CREATE INDEX idx_bazar_purchases_mess ON bazar_purchases(mess_id);

-- ============================================================
-- Table: bazar_purchase_items
-- Individual items within a bazar purchase
-- ============================================================
CREATE TABLE bazar_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES bazar_purchases(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,  -- kg, liter, piece, dozen, etc.
  unit_price BIGINT NOT NULL CHECK (unit_price >= 0),  -- In paisa
  total_price BIGINT NOT NULL CHECK (total_price >= 0),  -- In paisa (quantity * unit_price)
  category bazar_category NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bazar_items_purchase ON bazar_purchase_items(purchase_id);
CREATE INDEX idx_bazar_items_category ON bazar_purchase_items(purchase_id, category);

-- ============================================================
-- Triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_bazar_duty_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bazar_duty_updated_at
  BEFORE UPDATE ON bazar_duties
  FOR EACH ROW EXECUTE FUNCTION update_bazar_duty_updated_at();

CREATE OR REPLACE FUNCTION update_bazar_purchase_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bazar_purchase_updated_at
  BEFORE UPDATE ON bazar_purchases
  FOR EACH ROW EXECUTE FUNCTION update_bazar_purchase_updated_at();

-- Auto-calculate total_price from quantity * unit_price
CREATE OR REPLACE FUNCTION set_bazar_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price := (NEW.quantity * NEW.unit_price)::BIGINT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bazar_item_total
  BEFORE INSERT OR UPDATE ON bazar_purchase_items
  FOR EACH ROW EXECUTE FUNCTION set_bazar_item_total();

-- Auto-calculate purchase total from items on insert
CREATE OR REPLACE FUNCTION update_bazar_purchase_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bazar_purchases
  SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0)::BIGINT
    FROM bazar_purchase_items
    WHERE purchase_id = NEW.purchase_id
  )
  WHERE id = NEW.purchase_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bazar_item_update_total
  AFTER INSERT ON bazar_purchase_items
  FOR EACH ROW EXECUTE FUNCTION update_bazar_purchase_total();

-- Update purchase total on item delete
CREATE OR REPLACE FUNCTION update_bazar_purchase_total_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bazar_purchases
  SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0)::BIGINT
    FROM bazar_purchase_items
    WHERE purchase_id = OLD.purchase_id
  )
  WHERE id = OLD.purchase_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bazar_item_update_total_delete
  AFTER DELETE ON bazar_purchase_items
  FOR EACH ROW EXECUTE FUNCTION update_bazar_purchase_total_on_delete();

-- ============================================================
-- Helper: validate bazar exchange rules
-- ============================================================
CREATE OR REPLACE FUNCTION validate_bazar_exchange(
  p_mess_id UUID,
  p_requester_id UUID,
  p_requester_duty_id UUID,
  p_target_id UUID,
  p_target_duty_id UUID
)
RETURNS TABLE (valid BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_duty RECORD;
  tgt_duty RECORD;
  today_dhaka DATE;
BEGIN
  today_dhaka := dhaka_date();

  -- Rule: Both must be active members of the same mess
  IF NOT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = p_mess_id AND user_id = p_requester_id AND status = 'active'
  ) OR NOT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = p_mess_id AND user_id = p_target_id AND status = 'active'
  ) THEN
    RETURN QUERY SELECT false, 'Both members must be active mess members'::TEXT;
    RETURN;
  END IF;

  -- Rule: Cannot exchange with self
  IF p_requester_id = p_target_id THEN
    RETURN QUERY SELECT false, 'Cannot exchange with yourself'::TEXT;
    RETURN;
  END IF;

  -- Rule: Both duties must exist and belong to the same mess
  SELECT * INTO req_duty FROM bazar_duties WHERE id = p_requester_duty_id;
  SELECT * INTO tgt_duty FROM bazar_duties WHERE id = p_target_duty_id;

  IF req_duty.mess_id != p_mess_id OR tgt_duty.mess_id != p_mess_id THEN
    RETURN QUERY SELECT false, 'Duty does not belong to this mess'::TEXT;
    RETURN;
  END IF;

  -- Rule: Cannot exchange past duties
  IF req_duty.duty_date < today_dhaka THEN
    RETURN QUERY SELECT false, 'Cannot exchange a past duty'::TEXT;
    RETURN;
  END IF;

  IF tgt_duty.duty_date < today_dhaka THEN
    RETURN QUERY SELECT false, 'Cannot exchange a past duty'::TEXT;
    RETURN;
  END IF;

  -- Rule: Prevent duplicate pending exchange requests
  IF EXISTS (
    SELECT 1 FROM bazar_exchange_requests er
    WHERE er.requester_id = p_requester_id
      AND er.requester_duty_id = p_requester_duty_id
      AND er.status = 'pending'
  ) THEN
    RETURN QUERY SELECT false, 'You already have a pending exchange request for this duty'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM bazar_exchange_requests er
    WHERE er.target_id = p_target_id
      AND er.target_duty_id = p_target_duty_id
      AND er.status = 'pending'
  ) THEN
    RETURN QUERY SELECT false, 'This duty already has a pending exchange request'::TEXT;
    RETURN;
  END IF;

  -- All rules passed
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE bazar_duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazar_exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazar_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazar_purchase_items ENABLE ROW LEVEL SECURITY;

-- bazar_duties: members can read, managers can write
CREATE POLICY "bazar_duties_select"
  ON bazar_duties FOR SELECT
  USING (
    is_mess_member(mess_id) = true
    OR is_mess_manager(mess_id) = true
  );

CREATE POLICY "bazar_duties_insert"
  ON bazar_duties FOR INSERT
  WITH CHECK (is_mess_manager(mess_id) = true);

CREATE POLICY "bazar_duties_update"
  ON bazar_duties FOR UPDATE
  USING (is_mess_manager(mess_id) = true);

CREATE POLICY "bazar_duties_delete"
  ON bazar_duties FOR DELETE
  USING (is_mess_manager(mess_id) = true);

-- bazar_exchange_requests: members can read their own/incoming, managers can read all
CREATE POLICY "bazar_exchange_requests_select"
  ON bazar_exchange_requests FOR SELECT
  USING (
    is_mess_manager(mess_id) = true
    OR requester_id = auth.uid()
    OR target_id = auth.uid()
  );

CREATE POLICY "bazar_exchange_requests_insert"
  ON bazar_exchange_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND is_mess_member(mess_id) = true
  );

-- Only the target member can accept/reject their own incoming request; managers can override
CREATE POLICY "bazar_exchange_requests_update"
  ON bazar_exchange_requests FOR UPDATE
  USING (
    is_mess_manager(mess_id) = true
    OR (auth.uid() = target_id AND status = 'pending')
  );

-- bazar_purchases: members can read all in mess, buyer or manager can write
CREATE POLICY "bazar_purchases_select"
  ON bazar_purchases FOR SELECT
  USING (
    is_mess_member(mess_id) = true
    OR is_mess_manager(mess_id) = true
  );

CREATE POLICY "bazar_purchases_insert"
  ON bazar_purchases FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
    AND is_mess_member(mess_id) = true
  );

CREATE POLICY "bazar_purchases_update"
  ON bazar_purchases FOR UPDATE
  USING (
    is_mess_manager(mess_id) = true
    OR auth.uid() = buyer_id
  );

-- bazar_purchase_items: inherit from bazar_purchases
CREATE POLICY "bazar_purchase_items_select"
  ON bazar_purchase_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bazar_purchases bp
      WHERE bp.id = purchase_id
        AND (
          EXISTS (
            SELECT 1 FROM mess_members
            WHERE mess_id = bp.mess_id AND user_id = auth.uid() AND status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM messes WHERE id = bp.mess_id AND manager_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "bazar_purchase_items_insert"
  ON bazar_purchase_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bazar_purchases bp
      WHERE bp.id = purchase_id
        AND bp.buyer_id = auth.uid()
    )
  );

CREATE POLICY "bazar_purchase_items_update"
  ON bazar_purchase_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bazar_purchases bp
      WHERE bp.id = purchase_id
        AND (
          bp.buyer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM messes WHERE id = bp.mess_id AND manager_id = auth.uid())
        )
    )
  );

CREATE POLICY "bazar_purchase_items_delete"
  ON bazar_purchase_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bazar_purchases bp
      WHERE bp.id = purchase_id
        AND (
          bp.buyer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM messes WHERE id = bp.mess_id AND manager_id = auth.uid())
        )
    )
  );

COMMENT ON TABLE bazar_duties IS 'Monthly bazar duty schedule per mess. Manager creates/edits.';
COMMENT ON TABLE bazar_exchange_requests IS 'Immutable record of bazar duty exchange requests and their outcomes.';
COMMENT ON TABLE bazar_purchases IS 'A bazar shopping trip. Total auto-calculated from items.';
COMMENT ON TABLE bazar_purchase_items IS 'Individual items in a bazar purchase. Total auto-calculated from quantity * unit_price.';
