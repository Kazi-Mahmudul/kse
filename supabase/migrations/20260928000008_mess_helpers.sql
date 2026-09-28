-- ============================================================
-- Mess Management System — Helper Functions & RPC
-- Migration: 20260928000008_mess_helpers.sql
-- ============================================================

-- Swap bazar duties when an exchange is accepted
CREATE OR REPLACE FUNCTION swap_bazar_duties(p_exchange_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exchange RECORD;
BEGIN
  -- Get exchange details
  SELECT * INTO v_exchange
  FROM bazar_exchange_requests
  WHERE id = p_exchange_id AND status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exchange not found or not accepted';
  END IF;

  -- Swap the duty dates atomically
  -- Update requester's duty to target's date
  UPDATE bazar_duties
  SET duty_date = v_exchange.target_duty_date,
      updated_at = now()
  WHERE id = v_exchange.requester_duty_id;

  -- Update target's duty to requester's date
  UPDATE bazar_duties
  SET duty_date = v_exchange.requester_duty_date,
      updated_at = now()
  WHERE id = v_exchange.target_duty_id;
END;
$$;

-- Get total bazar purchases for a mess in a date range
CREATE OR REPLACE FUNCTION get_mess_bazar_total(
  p_mess_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (total BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(bp.total_amount), 0)::BIGINT AS total
  FROM bazar_purchases bp
  WHERE bp.mess_id = p_mess_id
    AND bp.purchase_date BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Get member's current balance (from latest settlement or calculate)
CREATE OR REPLACE FUNCTION get_member_balance(
  p_mess_id UUID,
  p_user_id UUID
)
RETURNS TABLE (balance BIGINT, balance_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_latest_settlement RECORD;
  v_balance BIGINT;
  v_balance_type TEXT;
BEGIN
  -- Get the latest published/locked settlement for this mess
  SELECT * INTO v_latest_settlement
  FROM monthly_settlements
  WHERE mess_id = p_mess_id
    AND status IN ('published', 'locked')
  ORDER BY month_end DESC
  LIMIT 1;

  IF FOUND THEN
    -- Get balance from settlement item
    SELECT balance, balance_type INTO v_balance, v_balance_type
    FROM settlement_items
    WHERE settlement_id = v_latest_settlement.id
      AND member_id = p_user_id;

    RETURN QUERY SELECT v_balance, v_balance_type;
  ELSE
    -- No settlement yet — calculate running balance
    -- This is simplified; real implementation would need careful handling
    RETURN QUERY SELECT 0::BIGINT, 'settled'::TEXT;
  END IF;
END;
$$;

-- Get current meal rate for a mess (from latest settlement or calculate)
CREATE OR REPLACE FUNCTION get_current_meal_rate(p_mess_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_rate BIGINT;
BEGIN
  -- Get current month in Dhaka timezone
  v_month_start := date_trunc('month', CURRENT_DATE AT TIME ZONE 'Asia/Dhaka')::DATE;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Try to get from latest settlement
  SELECT meal_rate INTO v_rate
  FROM monthly_settlements
  WHERE mess_id = p_mess_id
    AND status IN ('published', 'locked')
    AND month_start = v_month_start
  LIMIT 1;

  IF FOUND THEN
    RETURN v_rate;
  END IF;

  -- Calculate from current month data
  SELECT INTO v_rate calculate_meal_rate(p_mess_id, v_month_start, v_month_end);

  RETURN COALESCE(v_rate, 0)::BIGINT;
END;
$$;

-- Get next bazar duty for a member
CREATE OR REPLACE FUNCTION get_next_bazar_duty(p_mess_id UUID, p_user_id UUID)
RETURNS TABLE (duty_date DATE, id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT bd.duty_date, bd.id
  FROM bazar_duties bd
  WHERE bd.mess_id = p_mess_id
    AND bd.user_id = p_user_id
    AND bd.duty_date >= dhaka_date()
  ORDER BY bd.duty_date ASC
  LIMIT 1;
END;
$$;

-- Get dashboard data for a member
CREATE OR REPLACE FUNCTION get_member_dashboard(p_mess_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_today DATE;
  v_month_start DATE;
  v_month_end DATE;
  v_meal_rate BIGINT;
  v_balance BIGINT;
  v_balance_type TEXT;
BEGIN
  v_today := dhaka_date();
  v_month_start := date_trunc('month', v_today)::DATE;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Get meal rate
  SELECT INTO v_meal_rate get_current_meal_rate(p_mess_id);

  -- Get balance
  SELECT INTO v_balance, v_balance_type * FROM get_member_balance(p_mess_id, p_user_id);

  -- Build result
  SELECT json_build_object(
    'today_meals', (
      SELECT json_build_object(
        'breakfast', COALESCE(mr.state, 'off'),
        'lunch', COALESCE(mr_lunch.state, 'off'),
        'dinner', COALESCE(mr_dinner.state, 'off')
      )
      FROM meal_records mr
      LEFT JOIN meal_records mr_lunch ON mr_lunch.mess_id = p_mess_id
        AND mr_lunch.user_id = p_user_id
        AND mr_lunch.meal_date = v_today
        AND mr_lunch.meal_type = 'lunch'
      LEFT JOIN meal_records mr_dinner ON mr_dinner.mess_id = p_mess_id
        AND mr_dinner.user_id = p_user_id
        AND mr_dinner.meal_date = v_today
        AND mr_dinner.meal_type = 'dinner'
      WHERE mr.mess_id = p_mess_id
        AND mr.user_id = p_user_id
        AND mr.meal_date = v_today
        AND mr.meal_type = 'breakfast'
    ),
    'current_month_meals', (
      SELECT COUNT(*)::INT
      FROM meal_records
      WHERE mess_id = p_mess_id
        AND user_id = p_user_id
        AND meal_date BETWEEN v_month_start AND v_month_end
        AND state = 'on'
    ),
    'next_duty', (
      SELECT json_build_object('duty_date', bd.duty_date, 'id', bd.id)
      FROM bazar_duties bd
      WHERE bd.mess_id = p_mess_id
        AND bd.user_id = p_user_id
        AND bd.duty_date >= v_today
      ORDER BY bd.duty_date ASC
      LIMIT 1
    ),
    'meal_rate', v_meal_rate,
    'balance', v_balance,
    'balance_type', v_balance_type
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION swap_bazar_duties IS 'Atomically swaps bazar duty dates when an exchange is accepted';
COMMENT ON FUNCTION get_mess_bazar_total IS 'Returns total bazar purchases for a mess in a date range';
COMMENT ON FUNCTION get_member_balance IS 'Returns current balance for a member from latest settlement';
COMMENT ON FUNCTION get_current_meal_rate IS 'Returns current meal rate for a mess';
COMMENT ON FUNCTION get_next_bazar_duty IS 'Returns the next upcoming bazar duty for a member';
COMMENT ON FUNCTION get_member_dashboard IS 'Returns dashboard data for a member as JSON';
