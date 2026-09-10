import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressRing } from '@/components/ui/progress-ring';
import { FontFamilies } from '@/constants/theme';
import { profileCompletion } from '@/features/profile/completion';
import { useMyProfile, useMySkillIds } from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * "Complete Your Profile" card with a circular progress ring
 * (design 03._home_kse). The percentage is the real completion score from
 * `profileCompletion`, so the card hides itself once nothing is missing.
 */
export function ProfileCompletionCard() {
  const colors = useTheme();
  const profileQuery = useMyProfile();
  const skillsQuery = useMySkillIds();

  const profile = profileQuery.data;
  if (!profile) return null;

  const completion = profileCompletion(profile, skillsQuery.data?.length ?? 0);
  if (completion >= 100) return null;

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/profile/edit')}
      accessibilityRole="button"
      accessibilityLabel={`Complete your profile, ${completion} percent done`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.background, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.copy}>
        <ThemedText themeColor="heading" style={styles.title}>
          Complete Your Profile
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.body}>
          Increase your profile score and get better opportunities.
        </ThemedText>
      </View>
      <ProgressRing progress={completion}>
        <ThemedText themeColor="heading" style={styles.percent}>
          {completion}%
        </ThemedText>
      </ProgressRing>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 16,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
  },
  percent: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.85,
  },
});
