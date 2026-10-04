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
  // Bachelor To-Let events (spec bachelor-to-let §Notifications).
  'tolet_submitted',
  'tolet_approved',
  'tolet_rejected',
  'tolet_reported',
  'tolet_status_changed',
  // Student Hub events (spec student-hub §25).
  'hub_listing_approved',
  'hub_listing_rejected',
  'research_request',
  'research_request_response',
  'book_contact',
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

/** Admin composer target selector. Institution/district targeting uses the
 *  live education-institutions directory and the profile district field. */
export type NotificationAudience =
  | { kind: 'all_users' }
  | { kind: 'institution'; institutionId: string }
  | { kind: 'district'; district: string }
  | { kind: 'users'; userIds: string[] };

/** Service-role payload accepted by the notification server action. */
export interface NotificationDraft {
  type: NotificationType;
  title: string;
  body: string;
  opportunityId?: string | null;
  data?: Record<string, unknown>;
  audience: NotificationAudience;
}
