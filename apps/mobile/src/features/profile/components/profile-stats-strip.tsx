import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { profileCompletion } from '@/features/profile/completion';
import { useMyProfile, useMySkillIds } from '@/features/profile/queries';
import { useMyAchievements } from '@/features/portfolio/queries';
import { useSavedOpportunityIds } from '@/features/saved/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * Profile stats strip (design 05._profile_kse): 3-up cell row with hairline
 * dividers. Profile Score uses the live `profileCompletion` helper; the
 * other two slots are live counts from existing hooks (`useSavedOpportunityIds`,
 * `useMyAchievements`). While the profile query is pending we render `—`
 * placeholders so the layout doesn't jump on first paint.
 */
export function ProfileStatsStrip() {
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

  return (
    <View
      style={[
        styles.strip,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <Stat value={profile ? `${completion}%` : '—'} label="Profile Score" />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Stat value={String(savedCount)} label="Saved" />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Stat value={String(achievementsCount)} label="Achievements" />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.cell}>
      <ThemedText themeColor="heading" style={styles.value}>
        {value}
      </ThemedText>
      <ThemedText themeColor="textMuted" style={styles.label}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 1,
    height: 24,
  },
  value: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  label: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
});
