import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useSavedOpportunityIds, useToggleSavedOpportunity } from '@/features/saved/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { analytics } from '@/lib/analytics';
import type { OpportunitySummary } from '@kse/types';
import type { MentorSummary } from './types';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const MentorCard = memo(function MentorCard({
  mentor,
}: {
  mentor: OpportunitySummary | MentorSummary;
}) {
  const colors = useTheme();
  const tints = useTints();
  const savedIdsQuery = useSavedOpportunityIds();
  const toggleSaved = useToggleSavedOpportunity();

  const isSaved = savedIdsQuery.data?.has(mentor.id) ?? false;

  const handleToggleFavorite = () => {
    const nextSaved = !isSaved;
    toggleSaved.mutate({ opportunityId: mentor.id, saved: nextSaved });
    analytics.opportunitySaved(mentor.id, nextSaved);
  };

  const handlePressCard = () => {
    router.push({
      pathname: '/(tabs)/explore/mentorship/[id]' as any,
      params: { id: mentor.id },
    });
  };

  const displayTags = (mentor.tags && mentor.tags.length > 0)
    ? mentor.tags.slice(0, 3)
    : ['Guidance', 'Mentoring'];

  const rating = Number(mentor.rating_avg) || 4.8;
  const ratingCount = Number(mentor.rating_count) || 1;
  const experienceYears = Number(mentor.experience_years) || 3;

  return (
    /**
     * Outer View — not interactive itself.
     *
     * Two sibling Pressables inside:
     *   1. cardPressable  – covers the card content → navigate to profile
     *   2. favoriteButton – absolutely positioned top-right → toggle saved
     *
     * This avoids the web `<button> cannot contain a nested <button>` error
     * that occurs when a Pressable is a descendant of another Pressable.
     */
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: mentor.featured ? tints.amber.border : colors.border,
          boxShadow: `0px 2px 10px ${colors.shadow}`,
        },
      ]}
    >
      {/* ── Card navigation target ── */}
      <Pressable
        onPress={handlePressCard}
        accessibilityRole="button"
        accessibilityLabel={`${mentor.title} — ${mentor.organization_name}. View mentor profile.`}
        style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
      >
        <View style={styles.contentRow}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View
              style={[styles.avatarFallback, { backgroundColor: tints.indigo.bg }]}
              accessible={false}
            >
              <ThemedText style={[styles.avatarInitials, { color: tints.indigo.fg }]}>
                {initials(mentor.title)}
              </ThemedText>
            </View>
            {mentor.image_url ? (
              <Image
                source={{ uri: mentor.image_url }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
                accessible={false}
              />
            ) : null}
          </View>

          {/* Identity & Details */}
          <View style={styles.detailsCol}>
            {/* Name & Verified Badge */}
            <View style={styles.nameRow}>
              <ThemedText themeColor="heading" style={styles.name} numberOfLines={1}>
                {mentor.title}
              </ThemedText>
              {mentor.verified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={colors.primary}
                  style={styles.verifiedIcon}
                />
              ) : null}
            </View>

            {/* Subtitle: Organization or Education */}
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.orgText}
              numberOfLines={1}
            >
              {mentor.education ? mentor.education : mentor.organization_name}
            </ThemedText>

            {/* Skill Pills */}
            <View style={styles.skillsRow}>
              {displayTags.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.skillPill,
                    { backgroundColor: tints.indigo.bg, borderColor: tints.indigo.border },
                  ]}
                >
                  <ThemedText
                    style={[styles.skillPillText, { color: tints.indigo.fg }]}
                    numberOfLines={1}
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ')}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Rating & Experience */}
            <View style={styles.metaRow}>
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <ThemedText style={styles.ratingNumber}>
                  {rating.toFixed(1)}
                </ThemedText>
                <ThemedText style={[styles.reviewCount, { color: colors.textMuted }]}>
                  ({ratingCount})
                </ThemedText>
              </View>

              <ThemedText style={[styles.metaDot, { color: colors.border }]}>•</ThemedText>

              <ThemedText type="small" themeColor="textSecondary" style={styles.expText}>
                {experienceYears}+ years exp
              </ThemedText>

              {mentor.opportunity_mode ? (
                <>
                  <ThemedText style={[styles.metaDot, { color: colors.border }]}>•</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.expText}>
                    {mentor.opportunity_mode === 'remote'
                      ? 'Remote'
                      : mentor.opportunity_mode === 'hybrid'
                        ? 'Hybrid'
                        : 'In person'}
                  </ThemedText>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>

      {/* ── Favorite / Bookmark Heart — sibling of cardPressable, NOT its child ── */}
      <Pressable
        onPress={handleToggleFavorite}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? 'Remove from saved' : 'Save mentor'}
        style={({ pressed }) => [styles.favoriteButton, pressed && { opacity: 0.7 }]}
      >
        <Ionicons
          name={isSaved ? 'heart' : 'heart-outline'}
          size={18}
          color={isSaved ? '#EF4444' : colors.textMuted}
        />
      </Pressable>
    </View>
  );
});


const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    elevation: 1,
  },
  cardPressable: {
    padding: Spacing.three,
    paddingRight: Spacing.three + 28, // leave room for the absolute heart button
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
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
    fontSize: 15,
    fontFamily: FontFamilies.semiBold,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  detailsCol: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontFamily: FontFamilies.bold,
    flexShrink: 1,
  },
  verifiedIcon: {
    flexShrink: 0,
  },
  orgText: {
    fontSize: 11,
    fontFamily: FontFamilies.regular,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
    marginBottom: 4,
  },
  skillPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  skillPillText: {
    fontSize: 10,
    fontFamily: FontFamilies.medium,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingNumber: {
    fontSize: 11,
    fontFamily: FontFamilies.semiBold,
  },
  reviewCount: {
    fontSize: 10,
    fontFamily: FontFamilies.regular,
  },
  metaDot: {
    fontSize: 10,
  },
  expText: {
    fontSize: 11,
    fontFamily: FontFamilies.regular,
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    padding: 2,
  },
});
