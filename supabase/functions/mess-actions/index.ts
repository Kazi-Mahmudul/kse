// mess-actions — privileged write proxy for Mess Management System
//
// Handles complex business logic that RLS cannot express:
//   - Create mess (auto-assign creator as manager)
//   - Join mess (create membership request)
//   - Accept/reject member requests
//   - Process bazar exchanges (swap duties atomically)
//   - Lock/unlock months
//   - Generate settlements
//
// All writes go through the service role client to bypass RLS, then
// we write audit logs for accountability.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

class Bad extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

// ── Clients ───────────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

function getUserClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getUserId(authHeader: string): Promise<string> {
  const supabase = getUserClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Bad('Unauthorized', 401);
  return user.id;
}

async function requireManager(supabase: ReturnType<typeof createClient>, messId: string, userId: string): Promise<void> {
  const { data: mess } = await supabase
    .from('messes')
    .select('manager_id')
    .eq('id', messId)
    .single();
  if (!mess || mess.manager_id !== userId) {
    throw new Bad('Only the mess manager can perform this action', 403);
  }
}

async function requireActiveMember(supabase: ReturnType<typeof createClient>, messId: string, userId: string): Promise<void> {
  const { data: member } = await supabase
    .from('mess_members')
    .select('status')
    .eq('mess_id', messId)
    .eq('user_id', userId)
    .single();
  if (!member || member.status !== 'active') {
    throw new Bad('You must be an active mess member', 403);
  }
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_RULES: Record<string, { limit: number; windowSeconds: number }> = {
  create_mess: { limit: 5, windowSeconds: 3600 },
  join_mess: { limit: 10, windowSeconds: 3600 },
  request_exchange: { limit: 20, windowSeconds: 3600 },
  respond_exchange: { limit: 30, windowSeconds: 3600 },
  record_payment: { limit: 20, windowSeconds: 3600 },
  add_expense: { limit: 30, windowSeconds: 3600 },
  add_bazar: { limit: 30, windowSeconds: 3600 },
};

async function checkRateLimit(action: string, userId: string): Promise<void> {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return; // local dev: skip

  const rule = RATE_RULES[action];
  if (!rule) return;

  const key = `ratelimit:mess:${action}:${userId}`;
  try {
    const res = await fetch(`${url}/increment/${key}?expire=${rule.windowSeconds}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { result } = await res.json();
    if (result && result.value > rule.limit) {
      throw new Bad(`Rate limit exceeded for ${action}. Try again later.`, 429);
    }
  } catch (e) {
    if (e instanceof Bad) throw e;
    // Redis unavailable — allow
  }
}

// ── Audit logging ─────────────────────────────────────────────────────────────

async function logAudit(
  supabase: ReturnType<typeof createClient>,
  messId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
) {
  const { error } = await supabase.rpc('log_mess_action', {
    p_mess_id: messId,
    p_actor_id: actorId,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_description: description,
    p_old_values: oldValues ?? null,
    p_new_values: newValues ?? null,
  });
  if (error) console.error('Audit log error:', error);
}

// ── Action handlers ───────────────────────────────────────────────────────────

// POST /mess-actions
// Body: { action: string, ...params }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Length': '0' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  let userId: string;
  try {
    userId = await getUserId(authHeader);
  } catch {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { action, ...params } = body;
  if (!action) return json({ error: 'Missing action' }, 400);

  const supabase = getServiceClient();

  try {
    switch (action) {

      // ── Mess Creation ──────────────────────────────────────────────────────
      case 'create_mess': {
        await checkRateLimit('create_mess', userId);

        const { name, location, address, description, max_members } = params as {
          name: string;
          location?: string;
          address?: string;
          description?: string;
          max_members?: number;
        };

        if (!name?.trim()) throw new Bad('Mess name is required');

        // Create the mess with the user as manager
        const { data: mess, error: messErr } = await supabase
          .from('messes')
          .insert({
            name: name.trim(),
            location: location?.trim() || null,
            address: address?.trim() || null,
            description: description?.trim() || null,
            max_members: max_members ?? 10,
            manager_id: userId,
            created_by: userId,
          })
          .select()
          .single();

        if (messErr) throw new Bad(messErr.message);

        // Auto-create membership as active manager
        const { error: memberErr } = await supabase
          .from('mess_members')
          .insert({
            mess_id: mess.id,
            user_id: userId,
            role: 'manager',
            status: 'active',
            joined_at: new Date().toISOString(),
          });

        if (memberErr) {
          // Rollback mess creation
          await supabase.from('messes').delete().eq('id', mess.id);
          throw new Bad('Failed to create membership: ' + memberErr.message);
        }

        // Create default meal cut-off settings
        await supabase
          .from('meal_cutoff_settings')
          .insert({ mess_id: mess.id });

        await logAudit(supabase, mess.id, userId, 'settings_changed',
          'mess', mess.id, `Created mess "${name}"`);

        return json({ mess });
      }

      // ── Join Mess ──────────────────────────────────────────────────────────
      case 'join_mess': {
        await checkRateLimit('join_mess', userId);

        const { mess_id, invite_code } = params as {
          mess_id: string;
          invite_code?: string;
        };

        if (!mess_id) throw new Bad('mess_id is required');

        // Verify mess exists and is active
        const { data: mess } = await supabase
          .from('messes')
          .select('id, code, name, max_members')
          .eq('id', mess_id)
          .eq('is_active', true)
          .single();

        if (!mess) throw new Bad('Mess not found or inactive');

        // Check if already a member
        const { data: existing } = await supabase
          .from('mess_members')
          .select('status')
          .eq('mess_id', mess_id)
          .eq('user_id', userId)
          .single();

        if (existing) {
          if (existing.status === 'active') throw new Bad('You are already a member');
          if (existing.status === 'pending') throw new Bad('Join request is pending');
          // Allow re-joining if left/removed — just update status
          await supabase
            .from('mess_members')
            .update({ status: 'pending', left_at: null })
            .eq('mess_id', mess_id)
            .eq('user_id', userId);
        } else {
          // Check member limit
          const { count } = await supabase
            .from('mess_members')
            .select('*', { count: 'exact', head: true })
            .eq('mess_id', mess_id)
            .in('status', ['active', 'pending']);

          if ((count ?? 0) >= mess.max_members) {
            throw new Bad('Mess is full');
          }

          // Create membership request
          const { error: joinErr } = await supabase
            .from('mess_members')
            .insert({
              mess_id,
              user_id: userId,
              role: 'member',
              status: 'pending',
            });

          if (joinErr) throw new Bad(joinErr.message);
        }

        await logAudit(supabase, mess_id, userId, 'member_joined',
          'mess_member', null, `User requested to join mess`);

        return json({ success: true, mess });
      }

      // ── Accept/Reject Member ────────────────────────────────────────────────
      case 'respond_join_request': {
        const { member_id, mess_id, accept_action: acceptOrReject } = params as {
          member_id: string;
          mess_id: string;
          accept_action: 'accept' | 'reject';
        };

        await requireManager(supabase, mess_id, userId);

        const { data: member } = await supabase
          .from('mess_members')
          .select('user_id, status')
          .eq('id', member_id)
          .eq('mess_id', mess_id)
          .single();

        if (!member) throw new Bad('Member request not found');
        if (member.status !== 'pending') throw new Bad('Member is not pending');

        const newStatus = acceptOrReject === 'accept' ? 'active' : 'rejected';

        const { error: updateErr } = await supabase
          .from('mess_members')
          .update({
            status: newStatus,
            joined_at: acceptOrReject === 'accept' ? new Date().toISOString() : undefined,
          })
          .eq('id', member_id);

        if (updateErr) throw new Bad(updateErr.message);

        const auditAction = acceptOrReject === 'accept' ? 'member_accepted' : 'member_rejected';
        await logAudit(supabase, mess_id, userId, auditAction,
          'mess_member', member_id,
          acceptOrReject === 'accept' ? 'Member request accepted' : 'Member request rejected',
          { status: member.status }, { status: newStatus });

        return json({ success: true });
      }

      // ── Leave / Remove Member ───────────────────────────────────────────────
      case 'update_member_status': {
        const { member_id, mess_id, status } = params as {
          member_id: string;
          mess_id: string;
          status: 'left' | 'removed';
        };

        // Either the member themselves or the manager can do this
        const { data: member } = await supabase
          .from('mess_members')
          .select('user_id, status')
          .eq('id', member_id)
          .eq('mess_id', mess_id)
          .single();

        if (!member) throw new Bad('Member not found');

        const isManager = await supabase
          .from('messes')
          .select('manager_id')
          .eq('id', mess_id)
          .single()
          .then(r => r?.data?.manager_id === userId);

        const isSelf = member.user_id === userId;

        if (!isManager && !isSelf) {
          throw new Bad('Only the member or manager can do this', 403);
        }

        // Manager cannot remove themselves as manager
        if (status === 'removed' && isSelf) {
          throw new Bad('Use transfer_manager to leave as manager', 400);
        }

        const { error: updateErr } = await supabase
          .from('mess_members')
          .update({
            status,
            left_at: new Date().toISOString(),
          })
          .eq('id', member_id);

        if (updateErr) throw new Bad(updateErr.message);

        const auditAction = status === 'left' ? 'member_left' : 'member_removed';
        await logAudit(supabase, mess_id, userId, auditAction,
          'mess_member', member_id,
          `Member ${status}`,
          { status: member.status }, { status });

        return json({ success: true });
      }

      // ── Transfer Manager ──────────────────────────────────────────────────
      case 'transfer_manager': {
        const { mess_id, new_manager_id } = params as {
          mess_id: string;
          new_manager_id: string;
        };

        await requireManager(supabase, mess_id, userId);

        // Verify new manager is an active member
        const { data: newManager } = await supabase
          .from('mess_members')
          .select('user_id')
          .eq('mess_id', mess_id)
          .eq('user_id', new_manager_id)
          .eq('status', 'active')
          .single();

        if (!newManager) throw new Bad('New manager must be an active member');

        // Update old manager to member
        await supabase
          .from('mess_members')
          .update({ role: 'member' })
          .eq('mess_id', mess_id)
          .eq('user_id', userId);

        // Update new manager
        await supabase
          .from('mess_members')
          .update({ role: 'manager' })
          .eq('mess_id', mess_id)
          .eq('user_id', new_manager_id);

        // Update mess
        const { error: messErr } = await supabase
          .from('messes')
          .update({ manager_id: new_manager_id })
          .eq('id', mess_id);

        if (messErr) throw new Bad(messErr.message);

        await logAudit(supabase, mess_id, userId, 'settings_changed',
          'mess', mess_id, `Manager transferred from ${userId} to ${new_manager_id}`);

        return json({ success: true });
      }

      // ── Bazar Exchange ─────────────────────────────────────────────────────
      case 'request_exchange': {
        await checkRateLimit('request_exchange', userId);

        const { requester_duty_id, target_id, target_duty_id, mess_id } = params as {
          requester_duty_id: string;
          target_id: string;
          target_duty_id: string;
          mess_id: string;
        };

        await requireActiveMember(supabase, mess_id, userId);

        // Validate exchange rules
        const { data: validation } = await supabase
          .rpc('validate_bazar_exchange', {
            p_mess_id: mess_id,
            p_requester_id: userId,
            p_requester_duty_id: requester_duty_id,
            p_target_id: target_id,
            p_target_duty_id: target_duty_id,
          })
          .single();

        if (!validation?.valid) {
          throw new Bad(validation?.error_message || 'Exchange not allowed');
        }

        // Get requester's duty date
        const { data: reqDuty } = await supabase
          .from('bazar_duties')
          .select('duty_date')
          .eq('id', requester_duty_id)
          .single();

        // Get target's duty date
        const { data: tgtDuty } = await supabase
          .from('bazar_duties')
          .select('duty_date')
          .eq('id', target_duty_id)
          .single();

        // Create exchange request
        const { data: exchange, error: exchangeErr } = await supabase
          .from('bazar_exchange_requests')
          .insert({
            mess_id,
            requester_id: userId,
            requester_duty_id,
            requester_duty_date: reqDuty!.duty_date,
            requester_original_duty_date: reqDuty!.duty_date,
            target_id,
            target_duty_id,
            target_duty_date: tgtDuty!.duty_date,
            target_original_duty_date: tgtDuty!.duty_date,
            status: 'pending',
          })
          .select()
          .single();

        if (exchangeErr) throw new Bad(exchangeErr.message);

        await logAudit(supabase, mess_id, userId, 'exchange_requested',
          'bazar_exchange_request', exchange.id,
          `Exchange requested for ${reqDuty!.duty_date} ↔ ${tgtDuty!.duty_date}`);

        return json({ exchange });
      }

      case 'respond_exchange': {
        await checkRateLimit('respond_exchange', userId);

        const { exchange_id, accept_action: acceptOrReject, note } = params as {
          exchange_id: string;
          accept_action: 'accept' | 'reject';
          note?: string;
        };

        // Get exchange details
        const { data: exchange } = await supabase
          .from('bazar_exchange_requests')
          .select('*')
          .eq('id', exchange_id)
          .single();

        if (!exchange) throw new Bad('Exchange request not found');
        if (exchange.status !== 'pending') throw new Bad('Exchange already processed');
        if (exchange.target_id !== userId) {
          // Check if user is manager
          const { data: mess } = await supabase
            .from('messes')
            .select('manager_id')
            .eq('id', exchange.mess_id)
            .single();
          if (!mess || mess.manager_id !== userId) {
            throw new Bad('Only the target member or manager can respond', 403);
          }
        }

        const newStatus = acceptOrReject === 'accept' ? 'accepted' : 'rejected';

        // If accepting, swap the duties
        if (acceptOrReject === 'accept') {
          // Swap: requester's duty date ↔ target's duty date
          const { error: swapErr } = await supabase.rpc('swap_bazar_duties', {
            p_exchange_id: exchange_id,
          });
          if (swapErr) throw new Bad('Failed to swap duties: ' + swapErr.message);
        }

        // Update exchange status
        const { error: updateErr } = await supabase
          .from('bazar_exchange_requests')
          .update({
            status: newStatus,
            responded_at: new Date().toISOString(),
            responded_by: userId,
            response_note: note || null,
          })
          .eq('id', exchange_id);

        if (updateErr) throw new Bad(updateErr.message);

        const auditAction = acceptOrReject === 'accept' ? 'exchange_accepted' : 'exchange_rejected';
        await logAudit(supabase, exchange.mess_id, userId, auditAction,
          'bazar_exchange_request', exchange_id,
          `Exchange ${acceptOrReject}`,
          { status: 'pending' }, { status: newStatus });

        return json({ success: true });
      }

      // ── Add Bazar Purchase ─────────────────────────────────────────────────
      case 'add_bazar_purchase': {
        await checkRateLimit('add_bazar', userId);

        const { mess_id, purchase_date, notes, items } = params as {
          mess_id: string;
          purchase_date: string;
          notes?: string;
          items: Array<{
            item_name: string;
            quantity: number;
            unit: string;
            unit_price: number;
            category: string;
          }>;
        };

        await requireActiveMember(supabase, mess_id, userId);

        // Create purchase
        const { data: purchase, error: purchaseErr } = await supabase
          .from('bazar_purchases')
          .insert({
            mess_id,
            buyer_id: userId,
            purchase_date,
            notes: notes || null,
          })
          .select()
          .single();

        if (purchaseErr) throw new Bad(purchaseErr.message);

        // Add items
        const itemsWithPurchase = items.map(item => ({
          purchase_id: purchase.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          category: item.category,
        }));

        const { error: itemsErr } = await supabase
          .from('bazar_purchase_items')
          .insert(itemsWithPurchase);

        if (itemsErr) {
          // Rollback purchase
          await supabase.from('bazar_purchases').delete().eq('id', purchase.id);
          throw new Bad('Failed to add items: ' + itemsErr.message);
        }

        await logAudit(supabase, mess_id, userId, 'bazar_entry_added',
          'bazar_purchase', purchase.id,
          `Added bazar purchase of ${items.length} items`);

        return json({ purchase });
      }

      // ── Add Expense ────────────────────────────────────────────────────────
      case 'add_expense': {
        await checkRateLimit('add_expense', userId);

        const { mess_id, paid_by, category, amount, expense_date, description, is_shared } = params as {
          mess_id: string;
          paid_by: string;
          category: string;
          amount: number;
          expense_date: string;
          description?: string;
          is_shared?: boolean;
        };

        await requireManager(supabase, mess_id, userId);

        const { data: expense, error: expenseErr } = await supabase
          .from('mess_expenses')
          .insert({
            mess_id,
            paid_by,
            category,
            amount,
            expense_date,
            description: description || null,
            is_shared: is_shared ?? true,
            created_by: userId,
          })
          .select()
          .single();

        if (expenseErr) throw new Bad(expenseErr.message);

        await logAudit(supabase, mess_id, userId, 'expense_added',
          'mess_expense', expense.id,
          `Added expense: ${category} ৳${(amount / 100).toFixed(2)}`);

        return json({ expense });
      }

      // ── Record Payment ─────────────────────────────────────────────────────
      case 'record_payment': {
        await checkRateLimit('record_payment', userId);

        const { mess_id, member_id, amount, payment_date, payment_method, reference, note } = params as {
          mess_id: string;
          member_id: string;
          amount: number;
          payment_date: string;
          payment_method: string;
          reference?: string;
          note?: string;
        };

        // Either the member themselves or the manager can record
        const { data: member } = await supabase
          .from('mess_members')
          .select('user_id, status')
          .eq('mess_id', mess_id)
          .eq('user_id', member_id)
          .eq('status', 'active')
          .single();

        if (!member) throw new Bad('Member not found or not active');

        const isManager = await supabase
          .from('messes')
          .select('manager_id')
          .eq('id', mess_id)
          .single()
          .then(r => r?.data?.manager_id === userId);

        if (!isManager && member_id !== userId) {
          throw new Bad('Only the member or manager can record a payment', 403);
        }

        const { data: payment, error: paymentErr } = await supabase
          .from('mess_payments')
          .insert({
            mess_id,
            member_id,
            amount,
            payment_date,
            payment_method,
            reference: reference || null,
            note: note || null,
            status: 'confirmed', // Auto-confirm for now; manager can change
            recorded_by: userId,
            confirmed_by: isManager ? userId : null,
            confirmed_at: isManager ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (paymentErr) throw new Bad(paymentErr.message);

        await logAudit(supabase, mess_id, userId, 'payment_recorded',
          'mess_payment', payment.id,
          `Recorded payment ৳${(amount / 100).toFixed(2)} for member ${member_id}`,
          undefined, { amount, status: 'confirmed' });

        return json({ payment });
      }

      // ── Generate Settlement ─────────────────────────────────────────────────
      case 'generate_settlement': {
        const { mess_id, month_start, month_end, notes } = params as {
          mess_id: string;
          month_start: string;
          month_end: string;
          notes?: string;
        };

        await requireManager(supabase, mess_id, userId);

        // Check if settlement already exists
        const { data: existing } = await supabase
          .from('monthly_settlements')
          .select('id, status')
          .eq('mess_id', mess_id)
          .eq('month_start', month_start)
          .single();

        if (existing) {
          if (existing.status !== 'draft') {
            throw new Bad('Settlement already exists and is not in draft');
          }
          // Delete existing draft
          await supabase
            .from('monthly_settlements')
            .delete()
            .eq('id', existing.id);
        }

        // Calculate totals
        // Total meal cost = bazar purchases + shared expenses
        const { data: bazarTotal } = await supabase
          .rpc('get_mess_bazar_total', {
            p_mess_id: mess_id,
            p_start_date: month_start,
            p_end_date: month_end,
          })
          .single() as { data: { sum: number } | null };

        const { data: expenseTotal } = await supabase
          .from('mess_expenses')
          .select('amount')
          .eq('mess_id', mess_id)
          .gte('expense_date', month_start)
          .lte('expense_date', month_end)
          .eq('is_shared', true);

        const totalMealCost = (bazarTotal?.sum ?? 0) + (expenseTotal?.reduce((s, e) => s + e.amount, 0) ?? 0);

        // Total meals
        const { data: mealData } = await supabase
          .from('meal_records')
          .select('state')
          .eq('mess_id', mess_id)
          .gte('meal_date', month_start)
          .lte('meal_date', month_end);

        const totalMeals = mealData?.filter(r => r.state === 'on').length ?? 0;
        const mealRate = totalMeals > 0 ? Math.round(totalMealCost / totalMeals) : 0;

        // Create settlement
        const { data: settlement, error: settlementErr } = await supabase
          .from('monthly_settlements')
          .insert({
            mess_id,
            month_start,
            month_end,
            total_meal_cost: totalMealCost,
            total_meals: totalMeals,
            meal_rate: mealRate,
            status: 'draft',
            generated_at: new Date().toISOString(),
            generated_by: userId,
            notes: notes || null,
          })
          .select()
          .single();

        if (settlementErr) throw new Bad(settlementErr.message);

        // Get active members
        const { data: members } = await supabase
          .from('mess_members')
          .select('user_id')
          .eq('mess_id', mess_id)
          .eq('status', 'active');

        // Create settlement items for each member
        if (members) {
          for (const m of members) {
            // Get member's meal count
            const { data: memberMeals } = await supabase
              .from('meal_records')
              .select('state')
              .eq('mess_id', mess_id)
              .eq('user_id', m.user_id)
              .gte('meal_date', month_start)
              .lte('meal_date', month_end);

            const memberMealCount = memberMeals?.filter(r => r.state === 'on').length ?? 0;
            const mealCost = memberMealCount * mealRate;

            // Get bazar contribution
            const { data: bazarContrib } = await supabase
              .rpc('get_member_bazar_contribution', {
                p_mess_id: mess_id,
                p_user_id: m.user_id,
                p_month_start: month_start,
                p_month_end: month_end,
              })
              .single();

            // Get payments
            const { data: payments } = await supabase
              .from('mess_payments')
              .select('amount')
              .eq('mess_id', mess_id)
              .eq('member_id', m.user_id)
              .eq('status', 'confirmed')
              .gte('payment_date', month_start)
              .lte('payment_date', month_end);

            const totalPayments = payments?.reduce((s, p) => s + p.amount, 0) ?? 0;

            // Shared expense share per member (evenly split among active members)
            const sharedExpenseShare = expenseTotal
              ? Math.round(expenseTotal.reduce((s, e) => s + e.amount, 0) / members.length)
              : 0;

            const totalCost = mealCost + (bazarContrib ?? 0) + sharedExpenseShare;
            const balance = totalCost - totalPayments;

            let balanceType: 'due' | 'receivable' | 'settled' = 'settled';
            if (balance > 0) balanceType = 'due';
            else if (balance < 0) balanceType = 'receivable';

            await supabase
              .from('settlement_items')
              .insert({
                settlement_id: settlement.id,
                member_id: m.user_id,
                total_meals: memberMealCount,
                meal_cost: mealCost,
                bazar_contribution: bazarContrib ?? 0,
                shared_expense_share: sharedExpenseShare,
                total_cost: totalCost,
                total_payments: totalPayments,
                balance,
                balance_type: balanceType,
              });
          }
        }

        await logAudit(supabase, mess_id, userId, 'settlement_generated',
          'monthly_settlement', settlement.id,
          `Generated settlement for ${month_start} to ${month_end}`);

        return json({ settlement });
      }

      // ── Publish / Lock Settlement ───────────────────────────────────────────
      case 'publish_settlement': {
        const { settlement_id } = params as { settlement_id: string };

        const { data: settlement } = await supabase
          .from('monthly_settlements')
          .select('mess_id')
          .eq('id', settlement_id)
          .single();

        if (!settlement) throw new Bad('Settlement not found');
        await requireManager(supabase, settlement.mess_id, userId);

        const { error: updateErr } = await supabase
          .from('monthly_settlements')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', settlement_id);

        if (updateErr) throw new Bad(updateErr.message);

        await logAudit(supabase, settlement.mess_id, userId, 'settlement_published',
          'monthly_settlement', settlement_id, 'Settlement published');

        return json({ success: true });
      }

      case 'lock_settlement': {
        const { settlement_id } = params as { settlement_id: string };

        const { data: settlement } = await supabase
          .from('monthly_settlements')
          .select('mess_id')
          .eq('id', settlement_id)
          .single();

        if (!settlement) throw new Bad('Settlement not found');
        await requireManager(supabase, settlement.mess_id, userId);

        const { error: updateErr } = await supabase
          .from('monthly_settlements')
          .update({
            status: 'locked',
            locked_at: new Date().toISOString(),
            locked_by: userId,
          })
          .eq('id', settlement_id);

        if (updateErr) throw new Bad(updateErr.message);

        await logAudit(supabase, settlement.mess_id, userId, 'settlement_locked',
          'monthly_settlement', settlement_id, 'Settlement locked');

        return json({ success: true });
      }

      // ── Create Announcement ─────────────────────────────────────────────────
      case 'create_announcement': {
        const { mess_id, title, content, is_active, expires_at } = params as {
          mess_id: string;
          title: string;
          content: string;
          is_active?: boolean;
          expires_at?: string;
        };

        await requireManager(supabase, mess_id, userId);

        if (!title?.trim()) throw new Bad('Title is required');
        if (!content?.trim()) throw new Bad('Content is required');

        const { data: announcement, error: annErr } = await supabase
          .from('mess_announcements')
          .insert({
            mess_id,
            title: title.trim(),
            content: content.trim(),
            is_active: is_active ?? true,
            expires_at: expires_at || null,
            created_by: userId,
          })
          .select()
          .single();

        if (annErr) throw new Bad(annErr.message);

        await logAudit(supabase, mess_id, userId, 'announcement_created',
          'mess_announcement', announcement.id, `Created announcement: "${title}"`);

        return json({ announcement });
      }

      // ── Default ─────────────────────────────────────────────────────────────
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    if (e instanceof Bad) {
      return json({ error: e.message }, e.status);
    }
    console.error('mess-actions error:', e);
    return json({ error: 'Internal server error' }, 500);
  }
});
