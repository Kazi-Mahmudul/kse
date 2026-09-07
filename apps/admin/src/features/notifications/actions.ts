'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { NotificationAudience, NotificationDraft, NotificationType } from '@kse/types';

export interface NotificationActionState {
  error?: string;
  /** Number of recipient users whose row was created (in-app inbox). */
  delivered?: number;
}

function requireStaff(): void {
  // service-role write avoids all client RLS, but we still verify staff to
  // keep admin-only mutations behind the dashboard.
  throw new Error('staff check deferred to async wrapper');
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

/** Resolve an audience to a list of recipient user ids. */
async function resolveAudience(
  admin: ReturnType<typeof createAdminClient>,
  audience: NotificationAudience,
): Promise<string[]> {
  if (audience.kind === 'all_students') {
    const { data, error } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');
    if (error) throw new Error(error.message);
    return Array.from(new Set((data ?? []).map((row) => row.user_id)));
  }
  if (audience.kind === 'university') {
    // Recipients = students whose profile.university_id matches the target.
    const { data, error } = await admin
      .from('profiles')
      .select('id, university_id')
      .eq('university_id', audience.universityId);
    if (error) throw new Error(error.message);
    return Array.from(new Set((data ?? []).map((row) => row.id)));
  }
  return [audience.userId];
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
  const type = String(formData.get('type') ?? 'custom') as NotificationType;
  const opportunityId = String(formData.get('opportunityId') ?? '').trim();
  let audience: NotificationAudience;
  if (kind === 'all_students') {
    audience = { kind: 'all_students' };
  } else if (kind === 'university') {
    const universityId = String(formData.get('universityId') ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(universityId)) {
      return { error: 'Choose a university.' };
    }
    audience = { kind: 'university', universityId };
  } else if (kind === 'user') {
    const userId = String(formData.get('userId') ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      return { error: 'Choose a recipient.' };
    }
    audience = { kind: 'user', userId };
  } else {
    return { error: 'Choose who should receive this notification.' };
  }

  if (title.length < 3) return { error: 'Title must be at least 3 characters.' };
  if (body.length < 3) return { error: 'Body must be at least 3 characters.' };

  const data: Record<string, unknown> = {};
  const opportunityType = String(formData.get('opportunityType') ?? '').trim();
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
    return { error: 'No recipients match this audience.' };
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

  // Suppress unused-import warning for requireStaff (kept as type placeholder).
  void requireStaff;
  revalidatePath('/notifications');
  return { delivered: rows.length };
}
