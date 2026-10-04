'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  NOTIFICATION_TYPES,
  OPPORTUNITY_TYPES,
  type NotificationAudience,
  type NotificationDraft,
  type NotificationType,
  type OpportunityType,
} from '@kse/types';

export interface NotificationActionState {
  error?: string;
  /** Number of recipient users whose row was created (in-app inbox). */
  delivered?: number;
}

async function requireStaffUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not signed in.');
  }
  const { data: roles } = await supabase.from('user_roles').select('role');
  if (!isStaff((roles ?? []).map((row) => row.role as string))) {
    throw new Error('Staff access required.');
  }
  return user.id;
}

/** Resolve an audience to a list of recipient user ids. Suspended profiles
 *  are excluded from group audiences (a targeted user can still be reached). */
async function resolveAudience(
  admin: ReturnType<typeof createAdminClient>,
  audience: NotificationAudience,
): Promise<string[]> {
  if (audience.kind === 'all_users') {
    // Global announcement: every active account. Role membership is not a
    // filter — tutors and staff receive global notifications too.
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('status', 'active');
    if (error) throw new Error(error.message);
    return Array.from(new Set((data ?? []).map((row) => row.id)));
  }
  if (audience.kind === 'institution') {
    // Recipients = active users with an education row at the target
    // institution. Students link institutions through Portfolio →
    // Education: by id when picked from the directory, or by name text.
    const { data: institution, error: institutionError } = await admin
      .from('education_institutions')
      .select('name')
      .eq('id', audience.institutionId)
      .single();
    if (institutionError) throw new Error('Unknown institution.');
    const name = (institution?.name ?? '').trim();
    const byIds = new Set<string>();
    if (name) {
      const { data: byName, error: byNameError } = await admin
        .from('user_education')
        .select('user_id')
        .ilike('institution', name);
      if (byNameError) throw new Error(byNameError.message);
      for (const row of byName ?? []) byIds.add(row.user_id);
    }
    const { data: byFk, error: byFkError } = await admin
      .from('user_education')
      .select('user_id')
      .eq('institution_id', audience.institutionId);
    if (byFkError) throw new Error(byFkError.message);
    for (const row of byFk ?? []) byIds.add(row.user_id);
    if (byIds.size === 0) return [];
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('status', 'active')
      .in('id', Array.from(byIds));
    if (error) throw new Error(error.message);
    return Array.from(new Set((data ?? []).map((row) => row.id)));
  }
  if (audience.kind === 'district') {
    // Recipients = active users whose profile lists the target district
    // (Profile → Location, Khulna Division districts).
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('district', audience.district)
      .eq('status', 'active');
    if (error) throw new Error(error.message);
    return Array.from(new Set((data ?? []).map((row) => row.id)));
  }
  // Targeted sends may intentionally reach a suspended user.
  return Array.from(new Set(audience.userIds));
}

/**
 * Send a notification (spec §18, step 17). Inserts a row per recipient in
 * `notifications` so each user has their own in-app inbox entry. Returns
 * the count of inbox rows written.
 */
export async function sendNotification(
  _prev: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  try {
    await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const kind = String(formData.get('audienceKind') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const rawType = String(formData.get('type') ?? 'custom');
  const opportunityId = String(formData.get('opportunityId') ?? '').trim();
  const opportunityType = String(formData.get('opportunityType') ?? '').trim();
  let audience: NotificationAudience;
  if (kind === 'all_users') {
    audience = { kind: 'all_users' };
  } else if (kind === 'institution') {
    const institutionId = String(formData.get('institutionId') ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(institutionId)) {
      return { error: 'Choose an institution.' };
    }
    audience = { kind: 'institution', institutionId };
  } else if (kind === 'district') {
    const district = String(formData.get('district') ?? '').trim();
    if (!district) {
      return { error: 'Choose a district.' };
    }
    audience = { kind: 'district', district };
  } else if (kind === 'users') {
    // Checkboxes submit as repeated userIds entries — one or many people.
    const userIds = formData
      .getAll('userIds')
      .map((value) => String(value))
      .filter(Boolean);
    if (userIds.length === 0) {
      return { error: 'Choose at least one recipient.' };
    }
    if (userIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
      return { error: 'Choose valid recipients.' };
    }
    audience = { kind: 'users', userIds: Array.from(new Set(userIds)) };
  } else {
    return { error: 'Choose who should receive this notification.' };
  }

  if (title.length < 3) return { error: 'Title must be at least 3 characters.' };
  if (body.length < 3) return { error: 'Body must be at least 3 characters.' };
  if (!NOTIFICATION_TYPES.includes(rawType as NotificationType)) {
    return { error: 'Choose a valid notification type.' };
  }
  if (opportunityId && !/^[0-9a-f-]{36}$/i.test(opportunityId)) {
    return { error: 'Opportunity id must be a valid UUID.' };
  }
  if (
    opportunityType &&
    !OPPORTUNITY_TYPES.includes(opportunityType as OpportunityType)
  ) {
    return { error: 'Choose a valid opportunity type.' };
  }
  const type = rawType as NotificationType;

  const data: Record<string, unknown> = {};
  if (opportunityType) data.opportunity_type = opportunityType;

  const draft: NotificationDraft = {
    type,
    title,
    body,
    audience,
    opportunityId: opportunityId || null,
    data,
  };

  const admin = createAdminClient();
  let recipients: string[];
  try {
    recipients = await resolveAudience(admin, draft.audience);
  } catch (error) {
    return { error: (error as Error).message };
  }

  if (recipients.length === 0) {
    const reason =
      audience.kind === 'institution'
        ? 'No active users have that institution on their education yet — students link it via Portfolio → Education.'
        : audience.kind === 'district'
          ? 'No active users have that district on their profile yet — students set it in Profile → Edit → Location.'
          : 'No recipients match this audience.';
    return { error: reason };
  }

  const rows = recipients.map((userId) => ({
    id: randomUUID(),
    user_id: userId,
    type: draft.type,
    title: draft.title,
    body: draft.body,
    data: draft.data ?? {},
    opportunity_id: draft.opportunityId ?? null,
  }));

  const { error: insertError } = await admin.from('notifications').insert(rows);
  if (insertError) {
    return { error: insertError.message };
  }

  // Mirror delivery intents on notification_deliveries (in_app channel) so
  // an Edge Function can take over for push without re-resolving audience.
  const deliveryRows = recipients.map((userId, index) => ({
    notification_id: rows[index].id,
    channel: 'in_app',
    status: 'sent',
    sent_at: new Date().toISOString(),
  }));
  const { error: deliveryError } = await admin
    .from('notification_deliveries')
    .insert(deliveryRows);
  if (deliveryError) {
    return { error: deliveryError.message };
  }

  revalidatePath('/notifications');
  return { delivered: rows.length };
}
