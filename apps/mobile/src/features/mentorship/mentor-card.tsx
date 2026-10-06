import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import type { OpportunitySummary } from '@kse/types';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

/** Mode chip label for a mentor's session format. */
function modeLabel(mode: OpportunitySummary['opportunity_mode']): string {
  switch (mode) {
    case 'remote':
      return 'Remote';
    case 'hybrid':
      return 'Hybrid';
    case 'onsite':
      return 'In person';
    default:
      return 'Flexible';
  }
}

/** "RK" style initials for the avatar fallback while photos load (or if one fails). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * One mentor in the Mentorship directory: portrait avatar, name + verified
 * mark, role at a glance, pitch line, and session-format chips. Tapping the
 * card opens the mentor's full profile (the standard opportunity detail).
 */
export function MentorCard({ mentor }: { mentor: OpportunitySummary }) {
  const colors = useTheme();
  const tints = useTints();

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(tabs)/explore/[type]/[id]',
          params: { type: 'mentorship', id: mentor.id },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`${mentor.title} — ${mentor.organization_name}. View mentor profile.`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        mentor.featured && { borderColor: tints.amber.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          <View
            style={[styles.avatarFallback, { backgroundColor: tints.indigo.bg }]}
            accessible={false}
          >
            <ThemedText style={[styles.avatarInitials, { color: tints.indigo.fg }]}>
              {initials(mentor.title)}
            </ThemedText>
          </View>
          <Image
            source={{ uri: mentor.image_url ?? undefined }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
            accessible={false}
          />
        </View>

        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <ThemedText themeColor="heading" style={styles.name} numberOfLines={1}>
              {mentor.title}
            </ThemedText>
            {mentor.verified ? (
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={colors.primary}
                accessibilityLabel="Verified mentor"
              />
            ) : null}
          </View>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.role}
            numberOfLines={2}
          >
            {mentor.organization_name}
          </ThemedText>
        </View>
      </View>

      {mentor.summary ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {mentor.summary}
        </ThemedText>
      ) : null}

      <View style={styles.chipRow}>
        {mentor.featured ? (
          <View style={[styles.featuredBadge, { backgroundColor: tints.amber.bg }]}>
            <Ionicons name="star" size={10} color={tints.amber.fg} />
            <ThemedText style={[styles.featuredLabel, { color: tints.amber.fg }]}>
              Featured
            </ThemedText>
          </View>
        ) : null}
        <View style={[styles.chip, { borderColor: colors.border }]}>
          <Ionicons
            name={
              mentor.opportunity_mode === 'remote'
                ? 'videocam-outline'
                : mentor.opportunity_mode === 'hybrid'
                  ? 'swap-horizontal-outline'
                  : 'location-outline'
            }
            size={12}
            color={colors.primary}
          />
          <ThemedText type="small" themeColor="bodyStrong">
            {modeLabel(mentor.opportunity_mode)}
          </ThemedText>
        </View>
        {mentor.location ? (
          <View style={[styles.chip, { borderColor: colors.border }]}>
            <Ionicons name="pin-outline" size={12} color={colors.primary} />
            <ThemedText type="small" themeColor="bodyStrong">
              {mentor.location}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.spacer} />
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.995 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 22,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  role: {
    lineHeight: 16,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  featuredLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 10,
    lineHeight: 12,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  spacer: {
    flex: 1,
  },
});
