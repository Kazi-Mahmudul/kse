/**
 * Mobile product analytics facade (spec §20, step 19).
 *
 * Wrap every trackable moment in the app through `track()` so a future
 * Sentry/PostHog wiring drops in without rewriting call sites. For now:
 *
 *   * __DEV__           → console.debug with the event name
 *   * SENTRY_DSN set    → Sentry `addBreadcrumb` (when wired)
 *   * POSTHOG key set   → PostHog `capture`  (when wired)
 *
 * Per spec §20 we never carry PII (email, phone, resume, certificates) in
 * events. Only ids + public opportunity / community types.
 *
 * The exact event vocabulary mirrors the bullets in spec §20:
 *
 *   signup_completed, profile_completed, opportunity_viewed,
 *   opportunity_saved, apply_clicked, tutor_viewed, community_joined,
 *   notification_opened, deadline_reminder_dispatched.
 */

export type AnalyticsEvent =
  | 'signup_completed'
  | 'profile_completed'
  | 'opportunity_viewed'
  | 'opportunity_saved'
  | 'apply_clicked'
  | 'tutor_viewed'
  | 'community_joined'
  | 'notification_opened'
  | 'deadline_reminder_dispatched';

export interface AnalyticsEventMap {
  signup_completed: never;
  profile_completed: never;
  opportunity_viewed: { id: string; type: string };
  opportunity_saved: { id: string; saved: boolean };
  apply_clicked: { id: string; type: string };
  tutor_viewed: { id: string };
  community_joined: { id: string; joined: boolean };
  notification_opened: { id: string };
  deadline_reminder_dispatched: { opportunityId: string; daysBefore: number };
}

export type EventProperties<E extends AnalyticsEvent> = AnalyticsEventMap[E];

const HAS_POSTHOG = Boolean(process.env.EXPO_PUBLIC_POSTHOG_API_KEY);
const HAS_SENTRY = Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);

interface AnalyticsProvider {
  name: 'posthog' | 'sentry' | 'console';
  track<K extends AnalyticsEvent>(event: K, properties: EventProperties<K>): void;
}

const providers: AnalyticsProvider[] = [
  {
    name: 'console',
    track(event, properties) {
      if (__DEV__) {
        console.debug(`[analytics] ${event}`, properties ?? '');
      }
    },
  },
];

if (HAS_SENTRY) {
  providers.push({
    name: 'sentry',
    track(event, properties) {
      // Lazy import keeps the dependency out of the bundle until a DSN is
      // configured. Falls back to a no-op if the package isn't installed
      // yet — a real wiring lands with the Sentry install.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Sentry = require('@sentry/react-native');
        Sentry.addBreadcrumb({
          category: 'analytics',
          type: 'user',
          message: event,
          data: { ...(properties as Record<string, unknown>) },
          level: 'info',
        });
      } catch {
        // Sentry not installed yet — silently swallow.
      }
    },
  });
}

if (HAS_POSTHOG) {
  providers.push({
    name: 'posthog',
    track(event, properties) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const posthog = require('posthog-react-native').default;
        posthog?.capture?.(event, properties as Record<string, unknown>);
      } catch {
        // PostHog not installed yet — silently swallow.
      }
    },
  });
}

/** Fire-and-forget product event. Safe to call from anywhere. */
export function track<E extends AnalyticsEvent>(
  event: E,
  properties?: EventProperties<E>,
): void {
  for (const provider of providers) {
    try {
      provider.track(event, properties ?? (undefined as never));
    } catch {
      // Each provider is best-effort; never let analytics break the UI.
    }
  }
}

/** Convenience helper for the four hot paths we wire today. */
export const analytics = {
  opportunityViewed: (id: string, type: string) =>
    track('opportunity_viewed', { id, type }),
  opportunitySaved: (id: string, saved: boolean) =>
    track('opportunity_saved', { id, saved }),
  applyClicked: (id: string, type: string) =>
    track('apply_clicked', { id, type }),
  tutorViewed: (id: string) => track('tutor_viewed', { id }),
  communityJoined: (id: string, joined: boolean) =>
    track('community_joined', { id, joined }),
  notificationOpened: (id: string) => track('notification_opened', { id }),
  deadlineReminderDispatched: (opportunityId: string, daysBefore: number) =>
    track('deadline_reminder_dispatched', { opportunityId, daysBefore }),
};

export const _debug = { HAS_POSTHOG, HAS_SENTRY, providers: providers.map((p) => p.name) };
