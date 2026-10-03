-- ============================================================
-- Mess Management — Business-logic fixes from the UI redesign audit
-- Migration: 20261001120000_mess_logic_fixes.sql
--
-- Fixes:
--   1. calculate_meal_rate: cross-join between bazar_purchases and
--      mess_expenses inflated both sums (each purchase × each expense).
--      Meal rate is now bazar-only (shared expenses are split per member,
--      not folded into the rate — they were being double counted).
--   2. swap_bazar_duties: required status='accepted', but the edge
--      function swaps BEFORE updating the status, so every accepted
--      exchange failed. The swap now runs against the pending request and
--      marks it accepted atomically.
--   3. meal_records member policies: can_modify_meal() existed but was
--      never enforced — members could toggle meals after cut-off via
--      direct table writes. Manager policy stays unrestricted.
--   4. New get_member_running_balance(): authoritative live balance for
--      the current Dhaka month (meal cost + shared share − bazar credit −
--      payments), used by the redesigned dashboard and My Balance screen.
-- ============================================================

-- ── 1. Meal rate: bazar only, no cross-join ─────────────────────────────────

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
  v_bazar_total BIGINT;
  v_total_meals INT;
BEGIN
  SELECT COALESCE(SUM(bp.total_amount), 0)::BIGINT
  INTO v_bazar_total
  FROM bazar_purchases bp
  WHERE bp.mess_id = p_mess_id
    AND bp.purchase_date BETWEEN p_month_start AND p_month_end;

  SELECT COALESCE(SUM(CASE mr.state WHEN 'on' THEN 1 ELSE 0 END), 0)::INT
  INTO v_total_meals
  FROM meal_records mr
  WHERE mr.mess_id = p_mess_id
    AND mr.meal_date BETWEEN p_month_start AND p_month_end;

  IF v_total_meals > 0 THEN
    RETURN round(v_bazar_total::NUMERIC / v_total_meals)::BIGINT;
  END IF;
  RETURN 0;
END;
$$;

-- ── 2. Exchange swap: accept pending requests atomically ────────────────────

CREATE OR REPLACE FUNCTION swap_bazar_duties(p_exchange_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exchange RECORD;
BEGIN
  -- Lock the request row so two concurrent responders can't both swap.
  SELECT * INTO v_exchange
  FROM bazar_exchange_requests
  WHERE id = p_exchange_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exchange not found or already processed';
  END IF;

  -- Swap the duty dates atomically
  UPDATE bazar_duties
  SET duty_date = v_exchange.target_duty_date,
      updated_at = now()
  WHERE id = v_exchange.requester_duty_id;

  UPDATE bazar_duties
  SET duty_date = v_exchange.requester_duty_date,
      updated_at = now()
  WHERE id = v_exchange.target_duty_id;

  -- Mark accepted in the same transaction (the edge function adds the
  -- response metadata right after; this flag is what guards re-swaps).
  UPDATE bazar_exchange_requests
  SET status = 'accepted',
      responded_at = now()
  WHERE id = p_exchange_id;
END;
$$;

-- ── 3. Enforce meal cut-off in RLS for member writes ────────────────────────
-- Managers keep unrestricted update access (corrections); the edge function
-- performs manager writes with the service role, which bypasses RLS anyway.

DROP POLICY IF EXISTS "meal_records_update" ON meal_records;
CREATE POLICY "meal_records_update"
  ON meal_records FOR UPDATE
  USING (
    auth.uid() = user_id
    AND is_mess_member(mess_id) = true
    AND can_modify_meal(mess_id, user_id, meal_date, meal_type) = true
  )
  WITH CHECK (
    auth.uid() = user_id
    AND is_mess_member(mess_id) = true
    AND can_modify_meal(mess_id, user_id, meal_date, meal_type) = true
  );

DROP POLICY IF EXISTS "meal_records_insert" ON meal_records;
CREATE POLICY "meal_records_insert"
  ON meal_records FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_mess_member(mess_id) = true
    AND can_modify_meal(mess_id, user_id, meal_date, meal_type) = true
  );

-- ── 4. Running balance for the current Dhaka month ──────────────────────────

CREATE OR REPLACE FUNCTION get_member_running_balance(p_mess_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_member BOOLEAN;
  v_month_start DATE;
  v_month_end DATE;
  v_my_meals INT;
  v_mess_meals INT;
  v_settlement_rate BIGINT;
  v_meal_rate BIGINT;
  v_meal_cost BIGINT;
  v_shared_total BIGINT;
  v_active_members INT;
  v_shared_share BIGINT;
  v_bazar_contrib BIGINT;
  v_payments BIGINT;
  v_balance BIGINT;
  v_type TEXT;
BEGIN
  -- Caller must be the member themselves or the mess manager
  IF auth.uid() IS DISTINCT FROM p_user_id AND is_mess_manager(p_mess_id) = false THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = p_mess_id AND user_id = p_user_id AND status = 'active'
  ) INTO v_is_member;
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not an active member of this mess';
  END IF;

  v_month_start := date_trunc('month', dhaka_date())::DATE;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  SELECT COALESCE(SUM(CASE mr.state WHEN 'on' THEN 1 ELSE 0 END), 0)::INT
  INTO v_my_meals
  FROM meal_records mr
  WHERE mr.mess_id = p_mess_id
    AND mr.user_id = p_user_id
    AND mr.meal_date BETWEEN v_month_start AND v_month_end;

  SELECT COALESCE(SUM(CASE mr.state WHEN 'on' THEN 1 ELSE 0 END), 0)::INT
  INTO v_mess_meals
  FROM meal_records mr
  WHERE mr.mess_id = p_mess_id
    AND mr.meal_date BETWEEN v_month_start AND v_month_end;

  -- A published/locked settlement rate is authoritative for the month
  SELECT ms.meal_rate INTO v_settlement_rate
  FROM monthly_settlements ms
  WHERE ms.mess_id = p_mess_id
    AND ms.status IN ('published', 'locked')
    AND ms.month_start = v_month_start
  LIMIT 1;

  IF FOUND THEN
    v_meal_rate := v_settlement_rate;
  ELSE
    v_meal_rate := calculate_meal_rate(p_mess_id, v_month_start, v_month_end);
  END IF;

  v_meal_cost := v_my_meals * v_meal_rate;

  SELECT COALESCE(SUM(e.amount), 0)::BIGINT
  INTO v_shared_total
  FROM mess_expenses e
  WHERE e.mess_id = p_mess_id
    AND e.is_shared = true
    AND e.expense_date BETWEEN v_month_start AND v_month_end;

  SELECT count(*)::INT INTO v_active_members
  FROM mess_members
  WHERE mess_id = p_mess_id AND status = 'active';

  v_shared_share := CASE
    WHEN v_active_members > 0 THEN round(v_shared_total::NUMERIC / v_active_members)::BIGINT
    ELSE 0
  END;

  SELECT COALESCE(SUM(bp.total_amount), 0)::BIGINT
  INTO v_bazar_contrib
  FROM bazar_purchases bp
  WHERE bp.mess_id = p_mess_id
    AND bp.buyer_id = p_user_id
    AND bp.purchase_date BETWEEN v_month_start AND v_month_end;

  SELECT COALESCE(SUM(p.amount), 0)::BIGINT
  INTO v_payments
  FROM mess_payments p
  WHERE p.mess_id = p_mess_id
    AND p.member_id = p_user_id
    AND p.status = 'confirmed'
    AND p.payment_date BETWEEN v_month_start AND v_month_end;

  -- Positive = member owes the mess; negative = mess owes the member
  v_balance := (v_meal_cost + v_shared_share) - v_bazar_contrib - v_payments;
  v_type := CASE
    WHEN v_balance > 0 THEN 'due'
    WHEN v_balance < 0 THEN 'receivable'
    ELSE 'settled'
  END;

  RETURN json_build_object(
    'month_start', v_month_start,
    'month_end', v_month_end,
    'meals', v_my_meals,
    'meal_rate', v_meal_rate,
    'meal_cost', v_meal_cost,
    'shared_expense_share', v_shared_share,
    'shared_expense_total', v_shared_total,
    'active_members', v_active_members,
    'bazar_contribution', v_bazar_contrib,
    'payments', v_payments,
    'balance', v_balance,
    'balance_type', v_type
  );
END;
$$;

COMMENT ON FUNCTION calculate_meal_rate IS 'Bazar-only meal rate (paisa/meal). Shared expenses are split per member separately, not folded into the rate.';
COMMENT ON FUNCTION swap_bazar_duties IS 'Atomically swaps duty dates for a pending exchange and marks it accepted.';
COMMENT ON FUNCTION get_member_running_balance IS 'Live balance for the current Dhaka month: meal cost + shared share − bazar credit − confirmed payments.';
