/**
 * Mess Management — Admin Actions
 * Server-side operations for mess management using service role client.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function getAllMesses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('messes')
    .select(`
      *,
      manager:profiles!messes_manager_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMessById(messId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('messes')
    .select(`
      *,
      manager:profiles!messes_manager_id_fkey(full_name)
    `)
    .eq('id', messId)
    .single();

  if (error) throw error;
  return data;
}

export async function getMessMembers(messId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mess_members')
    .select(`
      *,
      user:profiles!mess_members_user_id_fkey(id, full_name, avatar_url, email)
    `)
    .eq('mess_id', messId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getMessMeals(messId: string, monthStart: string, monthEnd: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meal_records')
    .select(`
      *,
      user:profiles!meal_records_user_id_fkey(full_name)
    `)
    .eq('mess_id', messId)
    .gte('meal_date', monthStart)
    .lte('meal_date', monthEnd)
    .order('meal_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMessBazar(messId: string, monthStart: string, monthEnd: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bazar_purchases')
    .select(`
      *,
      buyer:profiles!bazar_purchases_buyer_id_fkey(full_name),
      items:bazar_purchase_items(*)
    `)
    .eq('mess_id', messId)
    .gte('purchase_date', monthStart)
    .lte('purchase_date', monthEnd)
    .order('purchase_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMessExpenses(messId: string, monthStart: string, monthEnd: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mess_expenses')
    .select(`
      *,
      paid_by:profiles!mess_expenses_paid_by_fkey(full_name)
    `)
    .eq('mess_id', messId)
    .gte('expense_date', monthStart)
    .lte('expense_date', monthEnd)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMessPayments(messId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mess_payments')
    .select(`
      *,
      member:profiles!mess_payments_member_id_fkey(full_name),
      recorded_by_profile:profiles!mess_payments_recorded_by_fkey(full_name)
    `)
    .eq('mess_id', messId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPendingExchanges(messId: string) {
  const supabase = await createClient();
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
  return data;
}

export async function getSettlement(messId: string, monthStart: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('monthly_settlements')
    .select(`
      *,
      generated_by_profile:profiles!monthly_settlements_generated_by_fkey(full_name),
      items:settlement_items(
        *,
        member:profiles!settlement_items_member_id_fkey(full_name)
      )
    `)
    .eq('mess_id', messId)
    .eq('month_start', monthStart)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getMessAnnouncements(messId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mess_announcements')
    .select('*')
    .eq('mess_id', messId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAuditLogs(messId: string, limit = 100) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mess_audit_logs')
    .select('*')
    .eq('mess_id', messId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function respondMemberRequest(
  memberId: string,
  messId: string,
  action: 'accept' | 'reject'
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('mess_members')
    .update({
      status: action === 'accept' ? 'active' : 'rejected',
      joined_at: action === 'accept' ? new Date().toISOString() : undefined,
    })
    .eq('id', memberId)
    .eq('mess_id', messId);

  if (error) throw error;
  revalidatePath(`/mess/${messId}`);
}

export async function removeMember(memberId: string, messId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('mess_members')
    .update({
      status: 'removed',
      left_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('mess_id', messId);

  if (error) throw error;
  revalidatePath(`/mess/${messId}`);
}

export async function addExpenseAction(formData: FormData) {
  const supabase = await createClient();

  const messId = formData.get('mess_id') as string;
  const paidBy = formData.get('paid_by') as string;
  const category = formData.get('category') as string;
  const amount = parseInt(formData.get('amount') as string, 10);
  const expenseDate = formData.get('expense_date') as string;
  const description = formData.get('description') as string;
  const isShared = formData.get('is_shared') === 'true';

  const { error } = await supabase.from('mess_expenses').insert({
    mess_id: messId,
    paid_by: paidBy,
    category,
    amount,
    expense_date: expenseDate,
    description: description || null,
    is_shared: isShared,
    created_by: (await supabase.auth.getUser()).data.user?.id,
  });

  if (error) throw error;
  revalidatePath(`/mess/${messId}`);
}

export async function addPaymentAction(formData: FormData) {
  const supabase = await createClient();

  const messId = formData.get('mess_id') as string;
  const memberId = formData.get('member_id') as string;
  const amount = parseInt(formData.get('amount') as string, 10);
  const paymentDate = formData.get('payment_date') as string;
  const paymentMethod = formData.get('payment_method') as string;
  const reference = formData.get('reference') as string;
  const note = formData.get('note') as string;

  const { error } = await supabase.from('mess_payments').insert({
    mess_id: messId,
    member_id: memberId,
    amount,
    payment_date: paymentDate,
    payment_method: paymentMethod,
    reference: reference || null,
    note: note || null,
    status: 'confirmed',
    recorded_by: (await supabase.auth.getUser()).data.user?.id,
    confirmed_by: (await supabase.auth.getUser()).data.user?.id,
    confirmed_at: new Date().toISOString(),
  });

  if (error) throw error;
  revalidatePath(`/mess/${messId}`);
}

export async function generateSettlementAction(messId: string, monthStart: string, monthEnd: string) {
  const supabase = await createClient();

  // Call the Edge Function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mess-actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'generate_settlement',
      mess_id: messId,
      month_start: monthStart,
      month_end: monthEnd,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to generate settlement');

  revalidatePath(`/mess/${messId}`);
  return json.settlement;
}

export async function publishSettlementAction(settlementId: string, messId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('monthly_settlements')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', settlementId);

  if (error) throw error;
  revalidatePath(`/mess/${messId}`);
}

export async function lockSettlementAction(settlementId: string, messId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('monthly_settlements')
    .update({
      status: 'locked',
      locked_at: new Date().toISOString(),
      locked_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .eq('id', settlementId);

  if (error) throw error;
  revalidatePath(`/mess/${messId}`);
}

export async function createAnnouncementAction(formData: FormData) {
  const supabase = await createClient();

  const messId = formData.get('mess_id') as string;
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const isActive = formData.get('is_active') === 'true';

  const { error } = await supabase.from('mess_announcements').insert({
    mess_id: messId,
    title,
    content,
    is_active: isActive,
    created_by: (await supabase.auth.getUser()).data.user?.id,
  });

  if (error) throw error;
  revalidatePath(`/mess/${messId}`);
}
