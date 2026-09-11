import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useMyResumes } from '@/features/portfolio/queries';
import { useMySkillIds } from '@/features/profile/queries';
import { useMyTutorApplication } from '@/features/tuition/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { IconName } from '@/types/icon';
import { formatDate } from '@/lib/dates';

interface RowSpec {
  key: string;
  icon: IconName;
  tint: 'purple' | 'indigo' | 'emerald';
  title: string;
  subtitle: string;
  href: '/(tabs)/profile/edit' | '/(tabs)/portfolio' | '/(tabs)/profile/become-tutor';
}

/**
 * Derive the resume row subtitle from the student's resume list. Empty list
 * gets an explicit "Not uploaded yet" so the row never renders blank;
 * multiple rows roll up into "{N} on file".
 */
function resumeSubtitle(
  resumes: { updatedAt: string }[] | undefined,
): string {
  if (!resumes || resumes.length === 0) return 'Not uploaded yet';
  if (resumes.length === 1) return `Updated ${formatDate(resumes[0].updatedAt)}`;
  return `${resumes.length} on file`;
}

/**
 * Derive the tutor row subtitle from the student's latest application.
 */
function tutorSubtitle(
  application: { status: 'pending' | 'approved' | 'rejected' } | null | undefined,
): string {
  switch (application?.status) {
    case 'pending':
      return 'Application under review';
    case 'approved':
      return 'Verified tutor — view profile';
    case 'rejected':
      return 'Not approved — apply again';
    default:
      return 'Apply & get listed';
  }
}

/**
 * Profile menu list (design 05._profile_kse): stacked rows for "Skills"
 * (routes to edit screen), "Resume" (routes to the portfolio hub) and
 * "Become a Tutor" (application workflow).
 */
export function ProfileMenuList() {
  const colors = useTheme();
  const tints = useTints();
  const skillIdsQuery = useMySkillIds();
  const resumesQuery = useMyResumes();
  const tutorApplicationQuery = useMyTutorApplication();

  const skillCount = skillIdsQuery.data?.length ?? 0;
  const skillSubtitle = `${skillCount} ${skillCount === 1 ? 'Skill' : 'Skills'} Added`;

  const rows: RowSpec[] = [
    {
      key: 'skills',
      icon: 'bulb-outline',
      tint: 'purple',
      title: 'Skills',
      subtitle: skillSubtitle,
      href: '/(tabs)/profile/edit',
    },
    {
      key: 'resume',
      icon: 'document-text-outline',
      tint: 'indigo',
      title: 'Resume',
      subtitle: resumeSubtitle(resumesQuery.data),
      href: '/(tabs)/portfolio',
    },
    {
      key: 'tutor',
      icon: 'school-outline',
      tint: 'emerald',
      title: 'Become a Tutor',
      subtitle: tutorSubtitle(tutorApplicationQuery.data),
      href: '/(tabs)/profile/become-tutor',
    },
  ];

  return (
    <View style={styles.wrap}>
      {rows.map((row) => {
        const tint = tints[row.tint];
        return (
          <Pressable
            key={row.key}
            onPress={() => router.push(row.href)}
            accessibilityRole="button"
            accessibilityLabel={`${row.title}, ${row.subtitle}`}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.iconPill, { backgroundColor: tint.bg }]}>
              <Ionicons name={row.icon} size={18} color={tint.fg} />
            </View>
            <View style={styles.text}>
              <ThemedText themeColor="heading" style={styles.title}>
                {row.title}
              </ThemedText>
              <ThemedText themeColor="textMuted" style={styles.subtitle}>
                {row.subtitle}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  subtitle: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.85,
  },
});
