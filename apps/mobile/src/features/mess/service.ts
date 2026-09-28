/**
 * Mess Management — Mobile Service
 *
 * Reads go through Supabase client directly (RLS enforced).
 * Writes go through the `mess-actions` Edge Function (rate-limited, audited).
 */

import { supabase } from '@/lib/supabase';
import type {
  Mess,
  MessDetail,
  MessMember,
  MessMemberDetail,
  MyMessItem,
  MessInvite,
  MealRecord,
  MealCutoffSettings,
  MealCalendarEntry,
  DailyMealSummary,
  BazarDuty,
  BazarExchangeRequest,
  ExchangeRequestDetail,
  BazarPurchase,
  BazarPurchaseDetail,
  BazarPurchaseItem,
  MessExpense,
  MessPayment,
  MonthlySettlement,
  SettlementDetail,
  SettlementItem,
  MessAnnouncement,
  MessAuditLog,
  CreateMessInput,
  MealToggleInput,
  BazarPurchaseInput,
  ExpenseInput,
  PaymentInput,
  ExchangeRequestInput,
  AnnouncementInput,
  MemberDashboard,
} from '@kse/types';

// ── Mess ─────────────────────────────────────────────────────────────────────

export async function fetchMyMesses(): Promise<MyMessItem[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('mess_members')
    .select(`
      mess:messes(
        *,
        manager:profiles!messes_manager_id_fkey(full_name)
      ),
      role,
      status
    `)
    .eq('user_id', session.user.id)
    .in('status', ['active', 'pending']);

  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r.mess as Record<string, unknown>),
    role: r.role as MyMessItem['role'],
    status: r.status as MyMessItem['status'],
    manager_name: (r.mess as MessDetail).manager_name,
  })) as MyMessItem[];
}

export async function fetchMessDetail(messId: string): Promise<MessDetail | null> {
  const { data, error } = await supabase
    .from('messes')
    .select(`
      *,
      manager:profiles!messes_manager_id_fkey(full_name)
    `)
    .eq('id', messId)
    .single();

  if (error) throw error;
  return data as MessDetail;
}

export async function createMess(input: CreateMessInput): Promise<Mess> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'create_mess', ...input }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create mess');
  return json.mess;
}

// ── Members ──────────────────────────────────────────────────────────────────

export async function fetchMessMembers(messId: string): Promise<MessMemberDetail[]> {
  const { data, error } = await supabase
    .from('mess_members')
    .select(`
      *,
      user:profiles!mess_members_user_id_fkey(
        id, full_name, avatar_url
      )
    `)
    .eq('mess_id', messId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data as MessMemberDetail[];
}

export async function joinMess(messId: string, inviteCode?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'join_mess', mess_id: messId, invite_code: inviteCode }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to join mess');
}

export async function respondJoinRequest(
  memberId: string,
  messId: string,
  action: 'accept' | 'reject'
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'respond_join_request', member_id: memberId, mess_id: messId, accept_action: action }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to respond');
}

export async function leaveMess(memberId: string, messId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'update_member_status', member_id: memberId, mess_id: messId, status: 'left' }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to leave mess');
}

// ── Meals ─────────────────────────────────────────────────────────────────────

export async function fetchMealCalendar(
  messId: string,
  startDate: string,
  endDate: string
): Promise<MealCalendarEntry[]> {
  const { data, error } = await supabase
    .from('meal_records')
    .select('*')
    .eq('mess_id', messId)
    .gte('meal_date', startDate)
    .lte('meal_date', endDate);

  if (error) throw error;

  // Group by date
  const byDate = new Map<string, MealCalendarEntry>();
  for (const rec of (data ?? []) as MealRecord[]) {
    if (!byDate.has(rec.meal_date)) {
      byDate.set(rec.meal_date, { date: rec.meal_date, breakfast: null, lunch: null, dinner: null, total: 0 });
    }
    const entry = byDate.get(rec.meal_date)!;
    entry[rec.meal_type] = rec.state;
    if (rec.state === 'on') entry.total++;
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchTodayMeals(messId: string, date: string): Promise<Record<string, 'on' | 'off'>> {
  const { data, error } = await supabase
    .from('meal_records')
    .select('*')
    .eq('mess_id', messId)
    .eq('meal_date', date);

  if (error) throw error;

  const result: Record<string, 'on' | 'off'> = { breakfast: 'off', lunch: 'off', dinner: 'off' };
  for (const rec of (data ?? []) as MealRecord[]) {
    result[rec.meal_type] = rec.state;
  }
  return result;
}

export async function toggleMeal(input: MealToggleInput): Promise<MealRecord> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Check if record exists
  const { data: existing } = await supabase
    .from('meal_records')
    .select('*')
    .eq('mess_id', input.mess_id)
    .eq('user_id', session.user.id)
    .eq('meal_date', input.meal_date)
    .eq('meal_type', input.meal_type)
    .single();

  let record: MealRecord;
  if (existing) {
    const { data, error } = await supabase
      .from('meal_records')
      .update({ state: input.state })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    record = data;
  } else {
    const { data, error } = await supabase
      .from('meal_records')
      .insert({
        mess_id: input.mess_id,
        user_id: session.user.id,
        meal_date: input.meal_date,
        meal_type: input.meal_type,
        state: input.state,
        created_by: session.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    record = data;
  }

  return record;
}

export async function fetchMealStats(
  messId: string,
  monthStart: string,
  monthEnd: string
): Promise<{ breakfast: number; lunch: number; dinner: number; total: number }> {
  const { data, error } = await supabase
    .from('meal_records')
    .select('meal_type, state')
    .eq('mess_id', messId)
    .gte('meal_date', monthStart)
    .lte('meal_date', monthEnd)
    .eq('state', 'on');

  if (error) throw error;

  const counts = { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
  for (const rec of (data ?? []) as MealRecord[]) {
    counts[rec.meal_type]++;
    counts.total++;
  }
  return counts;
}

// ── Bazar Duties ─────────────────────────────────────────────────────────────

export async function fetchBazarDuties(messId: string, monthStart: string, monthEnd: string): Promise<BazarDuty[]> {
  const { data, error } = await supabase
    .from('bazar_duties')
    .select('*, user:profiles!bazar_duties_user_id_fkey(full_name, avatar_url)')
    .eq('mess_id', messId)
    .gte('duty_date', monthStart)
    .lte('duty_date', monthEnd)
    .order('duty_date', { ascending: true });

  if (error) throw error;
  return data as BazarDuty[];
}

export async function fetchMyNextDuty(messId: string): Promise<BazarDuty | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('bazar_duties')
    .select('*, user:profiles!bazar_duties_user_id_fkey(full_name)')
    .eq('mess_id', messId)
    .eq('user_id', session.user.id)
    .gte('duty_date', today)
    .order('duty_date', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function requestExchange(input: ExchangeRequestInput): Promise<BazarExchangeRequest> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'request_exchange', ...input }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to request exchange');
  return json.exchange;
}

export async function respondExchange(
  exchangeId: string,
  action: 'accept' | 'reject',
  note?: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'respond_exchange', exchange_id: exchangeId, accept_action: action, note }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to respond to exchange');
}

export async function fetchPendingExchanges(messId: string): Promise<ExchangeRequestDetail[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('bazar_exchange_requests')
    .select(`
      *,
      requester:profiles!bazar_exchange_requests_requester_id_fkey(full_name),
      target:profiles!bazar_exchange_requests_target_id_fkey(full_name),
      requester_duty:bazar_duties!bazar_exchange_requests_requester_duty_id_fkey(*),
      target_duty:bazar_duties!bazar_exchange_requests_target_duty_id_fkey(*)
    `)
    .eq('mess_id', messId)
    .eq('status', 'pending');

  if (error) throw error;
  return data as ExchangeRequestDetail[];
}

// ── Bazar Purchases ───────────────────────────────────────────────────────────

export async function fetchBazarPurchases(
  messId: string,
  monthStart: string,
  monthEnd: string
): Promise<BazarPurchaseDetail[]> {
  const { data, error } = await supabase
    .from('bazar_purchases')
    .select(`
      *,
      buyer:profiles!bazar_purchases_buyer_id_fkey(full_name, avatar_url),
      items:bazar_purchase_items(*)
    `)
    .eq('mess_id', messId)
    .gte('purchase_date', monthStart)
    .lte('purchase_date', monthEnd)
    .order('purchase_date', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    buyer_name: (r.buyer as { full_name?: string } | null)?.full_name ?? null,
  })) as BazarPurchaseDetail[];
}

export async function addBazarPurchase(input: BazarPurchaseInput): Promise<BazarPurchase> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'add_bazar_purchase', ...input }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to add bazar purchase');
  return json.purchase;
}

export async function fetchMyBazarContribution(messId: string, monthStart: string, monthEnd: string): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 0;

  const { data, error } = await supabase
    .from('bazar_purchases')
    .select('total_amount')
    .eq('mess_id', messId)
    .eq('buyer_id', session.user.id)
    .gte('purchase_date', monthStart)
    .lte('purchase_date', monthEnd);

  if (error) throw error;
  return (data ?? []).reduce((sum: number, p: { total_amount: number }) => sum + p.total_amount, 0);
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function fetchMessExpenses(
  messId: string,
  monthStart: string,
  monthEnd: string
): Promise<MessExpense[]> {
  const { data, error } = await supabase
    .from('mess_expenses')
    .select('*, paid_by_profile:profiles!mess_expenses_paid_by_fkey(full_name)')
    .eq('mess_id', messId)
    .gte('expense_date', monthStart)
    .lte('expense_date', monthEnd)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data as MessExpense[];
}

export async function addExpense(input: ExpenseInput): Promise<MessExpense> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'add_expense', ...input }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to add expense');
  return json.expense;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function fetchMessPayments(messId: string): Promise<MessPayment[]> {
  const { data, error } = await supabase
    .from('mess_payments')
    .select('*, member:profiles!mess_payments_member_id_fkey(full_name)')
    .eq('mess_id', messId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data as MessPayment[];
}

export async function recordPayment(input: PaymentInput): Promise<MessPayment> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'record_payment', ...input }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to record payment');
  return json.payment;
}

// ── Settlements ───────────────────────────────────────────────────────────────

export async function fetchSettlement(messId: string, monthStart: string): Promise<SettlementDetail | null> {
  const { data, error } = await supabase
    .from('monthly_settlements')
    .select('*')
    .eq('mess_id', messId)
    .eq('month_start', monthStart)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const { data: items, error: itemsError } = await supabase
    .from('settlement_items')
    .select('*, member:profiles!settlement_items_member_id_fkey(full_name)')
    .eq('settlement_id', data.id);

  if (itemsError) throw itemsError;

  return { ...data, items: items as SettlementItem[] } as SettlementDetail;
}

export async function generateSettlement(
  messId: string,
  monthStart: string,
  monthEnd: string
): Promise<MonthlySettlement> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'generate_settlement', mess_id: messId, month_start: monthStart, month_end: monthEnd }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to generate settlement');
  return json.settlement;
}

// ── Announcements ──────────────────────────────────────────────────────────────

export async function fetchMessAnnouncements(messId: string): Promise<MessAnnouncement[]> {
  const { data, error } = await supabase
    .from('mess_announcements')
    .select('*')
    .eq('mess_id', messId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as MessAnnouncement[];
}

export async function createAnnouncement(input: AnnouncementInput): Promise<MessAnnouncement> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'create_announcement', ...input }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create announcement');
  return json.announcement;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function fetchMemberDashboard(messId: string): Promise<MemberDashboard | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // Fetch all data in parallel
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';
  const monthEnd = new Date(today.slice(0, 7) + '-01');
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(monthEnd.getDate() - 1);
  const monthEndStr = monthEnd.toISOString().split('T')[0];

  const [mess, todayMeals, mealStats, nextDuty, bazarContrib, mealRate, announcements] = await Promise.all([
    fetchMessDetail(messId),
    fetchTodayMeals(messId, today),
    fetchMealStats(messId, monthStart, monthEndStr),
    fetchMyNextDuty(messId),
    fetchMyBazarContribution(messId, monthStart, monthEndStr),
    supabase.rpc('get_current_meal_rate', { p_mess_id: messId }).then(r => r.data ?? 0),
    fetchMessAnnouncements(messId),
  ]);

  if (!mess) return null;

  return {
    mess,
    today_meals: {
      breakfast: (todayMeals.breakfast) as 'on' | 'off',
      lunch: todayMeals.lunch as 'on' | 'off',
      dinner: todayMeals.dinner as 'on' | 'off',
    },
    current_month_meals: mealStats.total,
    my_next_duty: nextDuty,
    my_bazar_contribution: bazarContrib,
    current_meal_rate: mealRate,
    my_balance: 0, // TODO: calculate from settlement
    my_balance_type: 'settled',
    announcements,
  };
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export async function fetchAuditLogs(messId: string, limit = 50): Promise<MessAuditLog[]> {
  const { data, error } = await supabase
    .from('mess_audit_logs')
    .select('*')
    .eq('mess_id', messId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as MessAuditLog[];
}
