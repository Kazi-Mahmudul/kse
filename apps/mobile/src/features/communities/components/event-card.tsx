import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { FontFamilies, Spacing } from '@/constants/theme';
import { formatEventDate } from '@/features/communities/format';
import { useSetEventRsvp } from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityEvent } from '@kse/types';

/**
 * Community event card (spec §Events): date block + title + mode/location,
 * with interested/attending RSVP chips for members (RLS-enforced).
 */
export function EventCard({ event }: { event: CommunityEvent }) {
  const colors = useTheme();
  const rsvp = useSetEventRsvp();

  const startDate = new Date(event.startsAt);

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
        <View style={[styles.dateBlock, { backgroundColor: `${colors.primary}14` }]}>
          <ThemedText themeColor="primary" style={styles.dateDay}>
            {String(startDate.getDate()).padStart(2, '0')}
          </ThemedText>
          <ThemedText type="small" themeColor="primary">
            {startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.info}>
          <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
            {event.title}
          </ThemedText>
          <View style={styles.metaRow}>
            <Ionicons
              name={event.mode === 'online' ? 'videocam-outline' : 'location-outline'}
              size={11}
              color={colors.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {event.mode === 'online' ? 'Online' : (event.location ?? 'To be announced')}
            </ThemedText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {formatEventDate(event.startsAt)}
            </ThemedText>
          </View>
          {event.communityName ? (
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={11} color={colors.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {event.communityName}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.image} contentFit="cover" />
      ) : null}

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textMuted">
          {event.attendingCount} attending · {event.interestedCount} interested
        </ThemedText>
        <View style={styles.rsvpRow}>
          <Chip
            label="Interested"
            selected={event.viewerRsvp === 'interested'}
            onPress={() =>
              rsvp.mutate({
                eventId: event.id,
                rsvp: event.viewerRsvp === 'interested' ? null : 'interested',
              })
            }
          />
          <Chip
            label="Going"
            selected={event.viewerRsvp === 'attending'}
            onPress={() =>
              rsvp.mutate({
                eventId: event.id,
                rsvp: event.viewerRsvp === 'attending' ? null : 'attending',
              })
            }
          />
        </View>
      </View>

      {event.mode !== 'offline' && event.meetingUrl ? (
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          onPress={() => Linking.openURL(event.meetingUrl!).catch(() => undefined)}
        >
          <Ionicons name="link-outline" size={13} color={colors.primary} />
          <ThemedText type="small" themeColor="primary" numberOfLines={1}>
            Join link available
          </ThemedText>
        </Pressable>
      ) : null}

      {rsvp.isError && (
        <ThemedText type="small" themeColor="danger">
          {(rsvp.error as Error).message}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three - 4,
    gap: Spacing.two - 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  dateBlock: {
    width: 46,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dateDay: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 19,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 13,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  image: {
    borderRadius: 12,
    height: 130,
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
