import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RegisterButton } from '@/components/register-button';
import { Spacing } from '@/constants/theme';
import { formatDate, formatDateTime } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';
import type { OpportunitySummary } from '@kse/types';

import { EventThumbnail } from './event-thumbnail';

interface EventCardProps {
  opportunity: OpportunitySummary;
}

/**
 * Event-hub card (spec 08._events_kse).
 *
 * Horizontal layout — 84×84 themed thumbnail on the left, title / organizer
 * / date+time / location stack on the right, and a compact Register pill at
 * the right edge of the row.
 *
 * The body Pressable and the RegisterButton Pressable are DOM *siblings* —
 * not nested — so RNW can render each as its own `<button>` without
 * triggering the React DOM nesting validator
 * (`<button>` cannot contain a `<button>`). The outer View carries the card
 * chrome (radius / border / shadow); the inner Pressable wraps only the
 * body so the Register pill sits next to it.
 */
export function EventCard({ opportunity }: EventCardProps) {
  const colors = useTheme();

  // Prefer the explicit event-start timestamp; fall back to the apply-by
  // `deadline` for events seeded before `starts_at` was added. Never show
  // a meaningless "1 Jan 1970 • 12:00 AM" — `formatDateTime` returns `null`
  // for missing input, and `formatDate` has its own fallback.
  const dateLine =
    formatDateTime(opportunity.starts_at) ??
    (opportunity.deadline ? formatDate(opportunity.deadline) : null);

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/[type]/[id]',
      params: { type: 'event', id: opportunity.id },
    });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={open}
          android_ripple={{ color: colors.shadow }}
          accessibilityRole="button"
          accessibilityLabel={`${opportunity.title} at ${opportunity.organization_name}`}
          style={({ pressed }) => [
            styles.bodyPress,
            pressed && { opacity: 0.95 },
          ]}
        >
          <EventThumbnail
            imageUrl={opportunity.image_url}
            eventType={opportunity.event_type}
          />

          <View style={styles.bodyText}>
            <Text
              style={[styles.title, { color: colors.heading ?? colors.text }]}
              numberOfLines={1}
            >
              {opportunity.title}
            </Text>
            <Text
              style={[
                styles.org,
                { color: colors.bodyStrong ?? colors.text },
              ]}
              numberOfLines={1}
            >
              {opportunity.organization_name}
            </Text>
            {dateLine ? (
              <View style={styles.metaRow}>
                <Ionicons
                  name="calendar-outline"
                  size={10}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.meta, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {dateLine}
                </Text>
              </View>
            ) : null}
            {opportunity.location ? (
              <View style={styles.metaRow}>
                <Ionicons
                  name="location-outline"
                  size={10}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.meta, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {opportunity.location}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.registerSlot}>
          <RegisterButton
            opportunityId={opportunity.id}
            variant="compact"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    // Subtle elevation matching the rest of the app's card shadow.
    elevation: 1,
    overflow: 'hidden', // clip the android_ripple to the card radius
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two + 2,
    gap: Spacing.three,
  },
  bodyPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  bodyText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  org: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    // Spec caps the location text width at ~120px so the Register pill
    // never collides with the location copy.
    maxWidth: 160,
  },
  meta: {
    fontSize: 10,
    flexShrink: 1,
  },
  registerSlot: {
    alignSelf: 'center',
    minWidth: 76, // keeps "Registered" legible without forcing the body to wrap
  },
});
