/**
 * Mess Management — Mobile Service
 *
 * Reads go through Supabase client directly (RLS enforced).
 * Writes go through the `mess-actions` Edge Function (rate-limited, audited).
 * All business dates are Dhaka-local (see lib/dates).
 */

import { supabase } from '@/lib/supabase';
import { dhakaToday, monthRangeFrom } from './lib/dates';
import type {
  Mess,
  MessDetail,
  MessMemberDetail,
  MyMessItem,
  MealRecord,
  MealCutoffSettings,
  MealCalendarEntry,
  BazarDuty,
  BazarPurchase,
  BazarPurchaseDetail,
  MessExpense,
  MessPayment,
  MonthlySettlement,
  SettlementDetail,
  MessAnnouncement,
  MessAuditLog,
  RunningBalance,
  CreateMessInput,
  MealToggleInput,
  BazarPurchaseInput,
  ExpenseInput,
  PaymentInput,
  ExchangeRequestInput,
  AnnouncementInput,
  MemberDashboard,
} from '@kse/types';

// ── Edge Function helper ─────────────────────────────────────────────────────

async function callMessAction(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json as Record<string, unknown>;
}

async function requireSessionUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return session.user.id;
}

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
  return (data ?? []).map((r: Record<string, unknown>) => {
    const mess = (r.mess ?? {}) as Record<string, unknown> & { manager?: { full_name?: string } };
    return {
      ...mess,
      manager_name: mess.manager?.full_name ?? undefined,
      role: r.role as MyMessItem['role'],
      status: r.status as MyMessItem['status'],
    } as MyMessItem;
  });
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
  const json = await callMessAction('create_mess', input as unknown as Record<string, unknown>);
  return json.mess as Mess;
}

export async function updateMessSettings(
  messId: string,
  patch: Partial<Pick<Mess, 'name' | 'location' | 'address' | 'description' | 'max_members'>>,
): Promise<Mess> {
  const json = await callMessAction('update_mess', { mess_id: messId, ...patch });
  return json.mess as Mess;
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
  // Flatten the joined profile into the *_name/_avatar_url fields the UI reads.
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as MessMemberDetail),
    user_name: (r.user as { full_name?: string } | null)?.full_name ?? undefined,
    user_avatar_url: (r.user as { avatar_url?: string | null } | null)?.avatar_url ?? null,
  }));
}

export async function joinMess(messId: string, inviteCode?: string): Promise<void> {
  await callMessAction('join_mess', { mess_id: messId, invite_code: inviteCode });
}

export async function respondJoinRequest(
  memberId: string,
  messId: string,
  action: 'accept' | 'reject',
): Promise<void> {
  await callMessAction('respond_join_request', { member_id: memberId, mess_id: messId, accept_action: action });
}

export async function leaveMess(memberId: string, messId: string): Promise<void> {
  await callMessAction('update_member_status', { member_id: memberId, mess_id: messId, status: 'left' });
}

export async function removeMember(memberId: string, messId: string): Promise<void> {
  await callMessAction('update_member_status', { member_id: memberId, mess_id: messId, status: 'removed' });
}

export async function transferManager(messId: string, newManagerId: string): Promise<void> {
  await callMessAction('transfer_manager', { mess_id: messId, new_manager_id: newManagerId });
}

// ── Meals ─────────────────────────────────────────────────────────────────────

/** The signed-in member's own meal calendar (one entry per recorded day). */
export async function fetchMealCalendar(
  messId: string,
  startDate: string,
  endDate: string,
): Promise<MealCalendarEntry[]> {
  const userId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('meal_records')
    .select('*')
    .eq('mess_id', messId)
    .eq('user_id', userId)
    .gte('meal_date', startDate)
    .lte('meal_date', endDate);

  if (error) throw error;

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
  const userId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('meal_records')
    .select('*')
    .eq('mess_id', messId)
    .eq('user_id', userId)
    .eq('meal_date', date);

  if (error) throw error;

  const result: Record<string, 'on' | 'off'> = { breakfast: 'off', lunch: 'off', dinner: 'off' };
  for (const rec of (data ?? []) as MealRecord[]) {
    result[rec.meal_type] = rec.state;
  }
  return result;
}

/** Meal counts for a month. `userId` filters to one member ('me' = the
 *  signed-in member); omitted = mess-wide totals. */
export async function fetchMealStats(
  messId: string,
  monthStart: string,
  monthEnd: string,
  userId?: 'me' | string,
): Promise<{ breakfast: number; lunch: number; dinner: number; total: number }> {
  let query = supabase
    .from('meal_records')
    .select('meal_type, state')
    .eq('mess_id', messId)
    .gte('meal_date', monthStart)
    .lte('meal_date', monthEnd)
    .eq('state', 'on');
  if (userId === 'me') {
    query = query.eq('user_id', await requireSessionUserId());
  } else if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const counts = { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
  for (const rec of (data ?? []) as MealRecord[]) {
    counts[rec.meal_type]++;
    counts.total++;
  }
  return counts;
}

export async function fetchMealCutoffSettings(messId: string): Promise<MealCutoffSettings | null> {
  const { data, error } = await supabase
    .from('meal_cutoff_settings')
    .select('*')
    .eq('mess_id', messId)
    .maybeSingle();
  if (error) throw error;
  return data as MealCutoffSettings | null;
}

/**
 * Turn a meal ON/OFF. Goes through the edge function so the cut-off is
 * enforced server-side (managers may override, which is audited).
 */
export async function toggleMeal(input: MealToggleInput): Promise<MealRecord> {
  const json = await callMessAction('set_meal', input as unknown as Record<string, unknown>);
  return json.record as MealRecord;
}

export async function updateMealCutoffs(
  messId: string,
  cutoffs: { breakfast?: string | null; lunch?: string | null; dinner?: string | null },
): Promise<MealCutoffSettings> {
  const json = await callMessAction('update_meal_cutoffs', { mess_id: messId, ...cutoffs });
  return json.settings as MealCutoffSettings;
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
  const userId = await requireSessionUserId();
  const today = dhakaToday();

  const { data, error } = await supabase
    .from('bazar_duties')
    .select('*, user:profiles!bazar_duties_user_id_fkey(full_name)')
    .eq('mess_id', messId)
    .eq('user_id', userId)
    .gte('duty_date', today)
    .order('duty_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function upsertBazarDuty(
  messId: string,
  memberUserId: string,
  dutyDate: string,
  dutyId?: string,
): Promise<BazarDuty> {
  const json = await callMessAction('upsert_bazar_duty', {
    mess_id: messId,
    member_user_id: memberUserId,
    duty_date: dutyDate,
    duty_id: dutyId,
  });
  return json.duty as BazarDuty;
}

export async function deleteBazarDuty(dutyId: string): Promise<void> {
  await callMessAction('delete_bazar_duty', { duty_id: dutyId });
}

export async function requestExchange(input: ExchangeRequestInput): Promise<void> {
  await callMessAction('request_exchange', input as unknown as Record<string, unknown>);
}

export async function respondExchange(
  exchangeId: string,
  action: 'accept' | 'reject',
  note?: string,
): Promise<void> {
  await callMessAction('respond_exchange', { exchange_id: exchangeId, accept_action: action, note });
}

export async function fetchPendingExchanges(messId: string): Promise<ExchangeDetailRow[]> {
  const userId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('bazar_exchange_requests')
    .select(`
      *,
      requester:profiles!bazar_exchange_requests_requester_id_fkey(full_name),
      target:profiles!bazar_exchange_requests_target_id_fkey(full_name)
    `)
    .eq('mess_id', messId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ExchangeDetailRow[]).map((r) => ({
    ...r,
    requester_name: r.requester?.full_name ?? undefined,
    target_name: r.target?.full_name ?? undefined,
    // Flags so any member can see which requests are theirs to answer.
    is_requester: r.requester_id === userId,
    is_target: r.target_id === userId,
  }));
}

// Local shape: exchange row + resolved names + viewer flags.
export interface ExchangeDetailRow {
  id: string;
  mess_id: string;
  requester_id: string;
  requester_duty_date: string;
  target_id: string;
  target_duty_date: string;
  status: string;
  created_at: string;
  requester?: { full_name?: string } | null;
  target?: { full_name?: string } | null;
  requester_name?: string;
  target_name?: string;
  is_requester?: boolean;
  is_target?: boolean;
}

// ── Bazar Purchases ───────────────────────────────────────────────────────────

export async function fetchBazarPurchases(
  messId: string,
  monthStart: string,
  monthEnd: string,
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
    .order('purchase_date', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    buyer_name: (r.buyer as { full_name?: string } | null)?.full_name ?? null,
  })) as BazarPurchaseDetail[];
}

export async function addBazarPurchase(input: BazarPurchaseInput): Promise<BazarPurchase> {
  const json = await callMessAction('add_bazar_purchase', input as unknown as Record<string, unknown>);
  return json.purchase as BazarPurchase;
}

export async function deleteBazarPurchase(purchaseId: string, messId: string): Promise<void> {
  await callMessAction('delete_bazar_purchase', { purchase_id: purchaseId, mess_id: messId });
}

export async function fetchMyBazarContribution(messId: string, monthStart: string, monthEnd: string): Promise<number> {
  const userId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('bazar_purchases')
    .select('total_amount')
    .eq('mess_id', messId)
    .eq('buyer_id', userId)
    .gte('purchase_date', monthStart)
    .lte('purchase_date', monthEnd);

  if (error) throw error;
  return (data ?? []).reduce((sum: number, p: { total_amount: number }) => sum + p.total_amount, 0);
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function fetchMessExpenses(
  messId: string,
  monthStart: string,
  monthEnd: string,
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
  const json = await callMessAction('add_expense', input as unknown as Record<string, unknown>);
  return json.expense as MessExpense;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await callMessAction('delete_expense', { expense_id: expenseId });
}

// ── Payments ──────────────────────────────────────────────────────────────────

/** Payments for the mess; filter to one member when `memberId` is given. */
export async function fetchMessPayments(messId: string, memberId?: string): Promise<MessPayment[]> {
  let query = supabase
    .from('mess_payments')
    .select('*, member:profiles!mess_payments_member_id_fkey(full_name)')
    .eq('mess_id', messId)
    .order('payment_date', { ascending: false })
    .limit(200);
  if (memberId) query = query.eq('member_id', memberId);

  const { data, error } = await query;
  if (error) throw error;
  return data as MessPayment[];
}

export async function recordPayment(input: PaymentInput): Promise<MessPayment> {
  const json = await callMessAction('record_payment', input as unknown as Record<string, unknown>);
  return json.payment as MessPayment;
}

// ── Balance ───────────────────────────────────────────────────────────────────

/** Live balance for the current Dhaka month, computed by the DB RPC. */
export async function fetchMyRunningBalance(messId: string): Promise<RunningBalance | null> {
  const userId = await requireSessionUserId();
  const { data, error } = await supabase
    .rpc('get_member_running_balance', { p_mess_id: messId, p_user_id: userId })
    .maybeSingle();
  if (error) throw error;
  return (data as RunningBalance) ?? null;
}

// ── Settlements ───────────────────────────────────────────────────────────────

export async function fetchSettlement(messId: string, monthStart: string): Promise<SettlementDetail | null> {
  const { data, error } = await supabase
    .from('monthly_settlements')
    .select('*')
    .eq('mess_id', messId)
    .eq('month_start', monthStart)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: items, error: itemsError } = await supabase
    .from('settlement_items')
    .select('*, member:profiles!settlement_items_member_id_fkey(full_name)')
    .eq('settlement_id', data.id);

  if (itemsError) throw itemsError;

  return { ...data, items: items as SettlementDetail['items'] } as SettlementDetail;
}

export async function generateSettlement(
  messId: string,
  monthStart: string,
  monthEnd: string,
): Promise<MonthlySettlement> {
  const json = await callMessAction('generate_settlement', { mess_id: messId, month_start: monthStart, month_end: monthEnd });
  return json.settlement as MonthlySettlement;
}

export async function publishSettlement(settlementId: string): Promise<void> {
  await callMessAction('publish_settlement', { settlement_id: settlementId });
}

export async function lockSettlement(settlementId: string): Promise<void> {
  await callMessAction('lock_settlement', { settlement_id: settlementId });
}

// ── Announcements ──────────────────────────────────────────────────────────────

export async function fetchMessAnnouncements(messId: string): Promise<MessAnnouncement[]> {
  const { data, error } = await supabase
    .from('mess_announcements')
    .select('*')
    .eq('mess_id', messId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data as MessAnnouncement[];
}

export async function createAnnouncement(input: AnnouncementInput): Promise<MessAnnouncement> {
  const json = await callMessAction('create_announcement', input as unknown as Record<string, unknown>);
  return json.announcement as MessAnnouncement;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function fetchMemberDashboard(messId: string): Promise<MemberDashboard | null> {
  const userId = await requireSessionUserId();

  const { start: monthStart, end: monthEnd } = monthRangeFrom(0);

  const [mess, todayMeals, myMealStats, nextDuty, bazarContrib, mealRate, balance, announcements] = await Promise.all([
    fetchMessDetail(messId),
    fetchTodayMeals(messId, dhakaToday()),
    fetchMealStats(messId, monthStart, monthEnd, userId),
    fetchMyNextDuty(messId),
    fetchMyBazarContribution(messId, monthStart, monthEnd),
    supabase.rpc('get_current_meal_rate', { p_mess_id: messId }).then(r => Number(r.data ?? 0)),
    fetchMyRunningBalance(messId),
    fetchMessAnnouncements(messId),
  ]);

  if (!mess) return null;

  return {
    mess,
    today_meals: {
      breakfast: todayMeals.breakfast as 'on' | 'off',
      lunch: todayMeals.lunch as 'on' | 'off',
      dinner: todayMeals.dinner as 'on' | 'off',
    },
    // The member's OWN meal count this month (was previously mess-wide).
    current_month_meals: myMealStats.total,
    my_next_duty: nextDuty,
    my_bazar_contribution: bazarContrib,
    current_meal_rate: mealRate,
    my_balance: balance?.balance ?? 0,
    my_balance_type: balance?.balance_type ?? 'settled',
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
