-- ============================================================
-- Mess Management System — Financial Tables
-- Migration: 20260928000005_mess_financial.sql
-- Tables: mess_expenses, mess_payments,
--         monthly_settlements, settlement_items
-- ============================================================

-- ============================================================
-- Table: mess_expenses
-- Shared mess expenses (rent, gas, electricity, etc.)
-- ============================================================
CREATE TABLE mess_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  paid_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,  -- Who actually paid
  category mess_expense_category NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),  -- In paisa
  expense_date DATE NOT NULL,  -- In Asia/Dhaka timezone
  description TEXT,
  receipt_url TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT true,  -- If split among all, or assigned to specific members
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_mess_expenses_mess_date ON mess_expenses(mess_id, expense_date);
CREATE INDEX idx_mess_expenses_category ON mess_expenses(mess_id, category);
CREATE INDEX idx_mess_expenses_mess ON mess_expenses(mess_id);

-- ============================================================
-- Table: mess_payments
-- Member payments into the mess
-- ============================================================
CREATE TABLE mess_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- Who paid
  amount BIGINT NOT NULL CHECK (amount >= 0),  -- In paisa
  payment_date DATE NOT NULL,  -- In Asia/Dhaka timezone
  payment_method payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,  -- Transaction ref, account number, etc.
  note TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_mess_payments_mess_date ON mess_payments(mess_id, payment_date);
CREATE INDEX idx_mess_payments_member ON mess_payments(member_id);
CREATE INDEX idx_mess_payments_mess ON mess_payments(mess_id);
CREATE INDEX idx_mess_payments_status ON mess_payments(mess_id, status);

-- ============================================================
-- Table: monthly_settlements
-- Monthly settlement header
-- ============================================================
CREATE TABLE monthly_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,  -- First day of the month in Dhaka timezone
  month_end DATE NOT NULL,    -- Last day of the month in Dhaka timezone
  total_meal_cost BIGINT NOT NULL DEFAULT 0,  -- In paisa: sum of (total_bazar + total_other_expenses)
  total_meals INT NOT NULL DEFAULT 0,
  meal_rate BIGINT NOT NULL DEFAULT 0,  -- In paisa per meal
  status settlement_status NOT NULL DEFAULT 'draft',
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (mess_id, month_start)
);

CREATE INDEX idx_monthly_settlements_mess ON monthly_settlements(mess_id);
CREATE INDEX idx_monthly_settlements_mess_month ON monthly_settlements(mess_id, month_start);

-- ============================================================
-- Table: settlement_items
-- Per-member breakdown in a monthly settlement
-- ============================================================
CREATE TABLE settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES monthly_settlements(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Meal breakdown
  total_meals INT NOT NULL DEFAULT 0,
  meal_cost BIGINT NOT NULL DEFAULT 0,  -- In paisa: total_meals * meal_rate

  -- Bazaar contribution (what this member spent on bazar)
  bazar_contribution BIGINT NOT NULL DEFAULT 0,  -- In paisa

  -- Shared expenses portion
  shared_expense_share BIGINT NOT NULL DEFAULT 0,  -- In paisa

  -- Total cost for this member
  total_cost BIGINT NOT NULL DEFAULT 0,  -- In paisa: meal_cost + bazar_contribution + shared_expense_share

  -- Payments made by this member this month
  total_payments BIGINT NOT NULL DEFAULT 0,  -- In paisa

  -- Final balance
  balance BIGINT NOT NULL DEFAULT 0,  -- In paisa: positive = due, negative = receivable
  balance_type TEXT NOT NULL DEFAULT 'due',  -- 'due', 'receivable', 'settled'

  -- Created at
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (settlement_id, member_id)
);

CREATE INDEX idx_settlement_items_settlement ON settlement_items(settlement_id);
CREATE INDEX idx_settlement_items_member ON settlement_items(member_id);

-- ============================================================
-- Triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_mess_expense_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mess_expense_updated_at
  BEFORE UPDATE ON mess_expenses
  FOR EACH ROW EXECUTE FUNCTION update_mess_expense_updated_at();

CREATE OR REPLACE FUNCTION update_mess_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mess_payment_updated_at
  BEFORE UPDATE ON mess_payments
  FOR EACH ROW EXECUTE FUNCTION update_mess_payment_updated_at();

CREATE OR REPLACE FUNCTION update_monthly_settlement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_monthly_settlement_updated_at
  BEFORE UPDATE ON monthly_settlements
  FOR EACH ROW EXECUTE FUNCTION update_monthly_settlement_updated_at();

-- ============================================================
-- Helper: calculate meal rate for a mess in a given month
-- Returns meal_rate in paisa per meal
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_meal_rate(
  p_mess_id UUID,
  p_month_start DATE,
  p_month_end DATE
)
RETURNS BIGINT  -- In paisa per meal
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_cost BIGINT;
  v_total_meals INT;
  v_rate BIGINT;
BEGIN
  -- Total meal-related cost = bazar purchases + shared expenses
  SELECT
    COALESCE(SUM(bp.total_amount), 0)::BIGINT
    + COALESCE(SUM(CASE WHEN e.is_shared THEN e.amount ELSE 0 END), 0)::BIGINT
  INTO v_total_cost
  FROM bazar_purchases bp
  LEFT JOIN mess_expenses e ON e.mess_id = bp.mess_id
  WHERE bp.mess_id = p_mess_id
    AND bp.purchase_date BETWEEN p_month_start AND p_month_end
    AND e.expense_date BETWEEN p_month_start AND p_month_end;

  -- Total meals for the month
  SELECT COALESCE(SUM(
    CASE mr.state WHEN 'on' THEN 1 ELSE 0 END
  ), 0)::INT
  INTO v_total_meals
  FROM meal_records mr
  WHERE mr.mess_id = p_mess_id
    AND mr.meal_date BETWEEN p_month_start AND p_month_end;

  -- Calculate rate (avoid division by zero)
  IF v_total_meals > 0 THEN
    v_rate := v_total_cost / v_total_meals;
  ELSE
    v_rate := 0;
  END IF;

  RETURN v_rate;
END;
$$;

-- ============================================================
-- Helper: calculate total bazar contribution for a member
-- ============================================================
CREATE OR REPLACE FUNCTION get_member_bazar_contribution(
  p_mess_id UUID,
  p_user_id UUID,
  p_month_start DATE,
  p_month_end DATE
)
RETURNS BIGINT  -- In paisa
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COALESCE(SUM(bp.total_amount), 0)::BIGINT
  INTO v_total
  FROM bazar_purchases bp
  WHERE bp.mess_id = p_mess_id
    AND bp.buyer_id = p_user_id
    AND bp.purchase_date BETWEEN p_month_start AND p_month_end;

  RETURN COALESCE(v_total, 0)::BIGINT;
END;
$$;

-- ============================================================
-- Helper: get member's meal count for a month
-- ============================================================
CREATE OR REPLACE FUNCTION get_member_meal_count(
  p_mess_id UUID,
  p_user_id UUID,
  p_month_start DATE,
  p_month_end DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN state = 'on' THEN 1 ELSE 0 END), 0)::INT
  INTO v_count
  FROM meal_records
  WHERE mess_id = p_mess_id
    AND user_id = p_user_id
    AND meal_date BETWEEN p_month_start AND p_month_end;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================
-- Helper: get member's total payments for a month
-- ============================================================
CREATE OR REPLACE FUNCTION get_member_payments(
  p_mess_id UUID,
  p_user_id UUID,
  p_month_start DATE,
  p_month_end DATE
)
RETURNS BIGINT  -- In paisa
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount), 0)::BIGINT
  INTO v_total
  FROM mess_payments
  WHERE mess_id = p_mess_id
    AND member_id = p_user_id
    AND payment_date BETWEEN p_month_start AND p_month_end
    AND status = 'confirmed';  -- Only confirmed payments

  RETURN COALESCE(v_total, 0)::BIGINT;
END;
$$;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE mess_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

-- mess_expenses: active members can read, managers can write
CREATE POLICY "mess_expenses_select"
  ON mess_expenses FOR SELECT
  USING (
    is_mess_member(mess_id) = true
    OR is_mess_manager(mess_id) = true
  );

CREATE POLICY "mess_expenses_insert"
  ON mess_expenses FOR INSERT
  WITH CHECK (is_mess_manager(mess_id) = true);

CREATE POLICY "mess_expenses_update"
  ON mess_expenses FOR UPDATE
  USING (is_mess_manager(mess_id) = true);

CREATE POLICY "mess_expenses_delete"
  ON mess_expenses FOR DELETE
  USING (is_mess_manager(mess_id) = true);

-- mess_payments: member sees own, manager sees all
CREATE POLICY "mess_payments_select"
  ON mess_payments FOR SELECT
  USING (
    is_mess_manager(mess_id) = true
    OR member_id = auth.uid()
  );

CREATE POLICY "mess_payments_insert"
  ON mess_payments FOR INSERT
  WITH CHECK (
    is_mess_manager(mess_id) = true
    OR auth.uid() = member_id  -- Members can record their own payments
  );

CREATE POLICY "mess_payments_update"
  ON mess_payments FOR UPDATE
  USING (is_mess_manager(mess_id) = true);

-- monthly_settlements: members can read, managers can write
CREATE POLICY "monthly_settlements_select"
  ON monthly_settlements FOR SELECT
  USING (
    is_mess_member(mess_id) = true
    OR is_mess_manager(mess_id) = true
  );

CREATE POLICY "monthly_settlements_insert"
  ON monthly_settlements FOR INSERT
  WITH CHECK (is_mess_manager(mess_id) = true);

CREATE POLICY "monthly_settlements_update"
  ON monthly_settlements FOR UPDATE
  USING (is_mess_manager(mess_id) = true);

-- settlement_items: members can read own, managers can read all
CREATE POLICY "settlement_items_select"
  ON settlement_items FOR SELECT
  USING (
    is_mess_manager(
      (SELECT mess_id FROM monthly_settlements WHERE id = settlement_id)
    ) = true
    OR member_id = auth.uid()
  );

CREATE POLICY "settlement_items_insert"
  ON settlement_items FOR INSERT
  WITH CHECK (
    is_mess_manager(
      (SELECT mess_id FROM monthly_settlements WHERE id = settlement_id)
    ) = true
  );

CREATE POLICY "settlement_items_update"
  ON settlement_items FOR UPDATE
  USING (
    is_mess_manager(
      (SELECT mess_id FROM monthly_settlements WHERE id = settlement_id)
    ) = true
  );

COMMENT ON TABLE mess_expenses IS 'Shared mess expenses (rent, gas, electricity, water, wifi, cleaning, etc.). Amount in paisa.';
COMMENT ON TABLE mess_payments IS 'Member payments into the mess. Amount in paisa.';
COMMENT ON TABLE monthly_settlements IS 'Monthly settlement header. Meal rate calculated server-side.';
COMMENT ON TABLE settlement_items IS 'Per-member breakdown in a monthly settlement. All amounts in paisa.';
