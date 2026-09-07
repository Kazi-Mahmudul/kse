import { supabase } from '@/lib/supabase';
import type { NotificationItem, NotificationType } from '@kse/types';

/**
 * In-app notifications inbox (spec §18). Rows are written by the admin server
 * action through the service role; clients can only read their own notifications
 * + flip read_at via the protected update trigger.
 */

export class NotificationError extends Error {}

function fail(context: string, message: string): never {
  throw new NotificationError(`${context}: ${message}`);
}

interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  opportunity_id: string | null;
  read_at: string | null;
  created_at: string;
}

function toItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data ?? {},
    opportunityId: row.opportunity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

const SELECT =
  'id, type, title, body, data, opportunity_id, read_at, created_at';

/** Newest notifications for the signed-in user. */
export async function listMyNotifications(
  limit = 50,
): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) fail('Could not load notifications', error.message);
  return ((data ?? []) as unknown as NotificationRow[]).map(toItem);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);

  if (error) fail('Could not load notification count', error.message);
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) fail('Could not mark notification read', error.message);
}

/** Read-all uses two queries (id list + bulk update) and lets the
 * notification_update_own policy + protect_notification_content trigger
 * gate writes server-side. */
export async function markAllNotificationsRead(): Promise<void> {
  const { data: unread, error: selectError } = await supabase
    .from('notifications')
    .select('id')
    .is('read_at', null);

  if (selectError) fail('Could not mark notifications read', selectError.message);
  const ids = (unread ?? []).map((row: { id: string }) => row.id);
  if (ids.length === 0) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: now })
    .in('id', ids);

  if (error) fail('Could not mark notifications read', error.message);
}
