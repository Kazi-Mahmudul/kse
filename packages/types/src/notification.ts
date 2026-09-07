/**
 * Notification types (spec §18). The DB enum is the source of truth —
 * these union literals and labels mirror it for the mobile app and admin.
 */

export const NOTIFICATION_TYPES = [
  'deadline_reminder',
  'new_opportunity',
  'event_upcoming',
  'community_announcement',
  'platform_announcement',
  'custom',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Shape returned by the in-app inbox (read-only). */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  opportunityId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Admin composer target selector. */
export type NotificationAudience =
  | { kind: 'all_students' }
  | { kind: 'university'; universityId: string }
  | { kind: 'user'; userId: string };

/** Service-role payload accepted by the notification server action. */
export interface NotificationDraft {
  type: NotificationType;
  title: string;
  body: string;
  opportunityId?: string | null;
  data?: Record<string, unknown>;
  audience: NotificationAudience;
}
