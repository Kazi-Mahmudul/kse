import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ProgressRing } from '@/components/ui/progress-ring';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  profileCompletion,
  profileCompletionChecks,
  type ProfileCompletionCheck,
} from '@/features/profile/completion';
import { useMyProfile, useMySkillIds } from '@/features/profile/queries';
import { useMyAchievements } from '@/features/portfolio/queries';
import { useSavedOpportunityIds } from '@/features/saved/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * Pick a short status line based on how complete the profile is. Mirrors
 * the dashboard's `completionLine()` so the two surfaces can't drift in
 * tone. Extended here with the "100% — you're all set" upper band.
 */
function statusLine(pct: number): string {
  if (pct >= 100) return "You're all set";
  if (pct >= 70) return 'Great! Keep it up';
  if (pct >= 40) return 'Good progress';
  return "Let's get started";
}

/**
 * Derive the single most actionable missing item. Returns the label of the
 * first check where `done === false`, prefixed with "Next: ". The list comes
 * from `profileCompletionChecks()` so the same source of truth used by the
 * Scholarship Hub surfaces here — the two can never disagree about what
 * counts as "complete".
 */
function nextMissingHint(checks: ProfileCompletionCheck[]): string {
  const next = checks.find((c) => !c.done);
  return next ? `Next: ${next.label}` : 'All set!';
}

/**
 * Profile Health card (design 05._profile_kse): the standout block on the
 * Profile tab. Minimal themed card — no gradient, no decorative glows.
 *
 * Layout (top to bottom):
 *   1. Header row: ProgressRing (left) + status + hint copy (right).
 *   2. Slim progress bar that echoes the ring percentage.
 *   3. Inline counts row ("Saved N · Achievements M") on a single line.
 *   4. Full-width primary "Improve Profile" button.
 *
 * The whole card is not pressable anymore — the only CTA is the explicit
 * button. Tapping anywhere outside the button does nothing, which keeps
 * the affordance honest.
 */
export function ProfileHealthCard() {
  const colors = useTheme();
  const profileQuery = useMyProfile();
  const skillIdsQuery = useMySkillIds();
  const savedQuery = useSavedOpportunityIds();
  const achievementsQuery = useMyAchievements();

  const profile = profileQuery.data;
  const skillCount = skillIdsQuery.data?.length ?? 0;
  const savedCount = savedQuery.data?.size ?? 0;
  const achievementsCount = achievementsQuery.data?.length ?? 0;

  const completion = profile ? profileCompletion(profile, skillCount) : 0;
  const hint = profile ? nextMissingHint(profileCompletionChecks(profile, skillCount)) : '—';

  const openEdit = () => router.push('/(tabs)/profile/edit');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header row: ring + status/hint copy */}
      <View style={styles.header}>
        <ProgressRing
          progress={completion}
          size={72}
          strokeWidth={6}
          color={colors.primary}
          trackColor={colors.border}
          startAt="top"
        >
          <ThemedText themeColor="heading" style={styles.ringLabel}>
            {completion}%
          </ThemedText>
        </ProgressRing>

        <View style={styles.copy}>
          <ThemedText themeColor="heading" style={styles.status} numberOfLines={1}>
            {statusLine(completion)}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.hint} numberOfLines={1}>
            {hint}
          </ThemedText>
        </View>
      </View>

      {/* Slim progress bar — mirrors the ring %, reinforces the percentage. */}
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: colors.primary, width: `${completion}%` },
          ]}
        />
      </View>

      {/* Inline counts — one row, dot-separated, small text. */}
      <View style={styles.countsRow}>
        <Ionicons name="bookmark-outline" size={14} color={colors.textSecondary} />
        <ThemedText themeColor="textSecondary" style={styles.countsText}>
          Saved {savedCount}
        </ThemedText>
        <View style={[styles.countsDot, { backgroundColor: colors.textMuted }]} />
        <Ionicons name="trophy-outline" size={14} color={colors.textSecondary} />
        <ThemedText themeColor="textSecondary" style={styles.countsText}>
          Achievements {achievementsCount}
        </ThemedText>
      </View>

      <PrimaryButton
        label="Improve Profile"
        onPress={openEdit}
        accessibilityLabel="Improve profile"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.three,
    // Soft shadow on light mode — disabled on dark where shadows muddy.
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  ringLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  status: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  hint: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countsText: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  countsDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    marginHorizontal: 4,
  },
});
