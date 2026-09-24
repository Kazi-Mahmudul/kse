import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useMyResumes } from '@/features/portfolio/queries';
import { useMySkillIds } from '@/features/profile/queries';
import { useMyApplications } from '@/features/scholarships/queries';
import { useSavedOpportunityIds } from '@/features/saved/queries';
import { useMyTutorApplication } from '@/features/tuition/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { IconName } from '@/types/icon';
import { formatDate } from '@/lib/dates';

type RowGroup = 'quick' | 'stuff' | 'tutor';

interface RowSpec {
  key: string;
  icon: IconName;
  tint: 'purple' | 'indigo' | 'emerald';
  title: string;
  subtitle: string;
  href:
    | '/(tabs)/profile/edit'
    | '/(tabs)/saved'
    | '/(tabs)/portfolio'
    | '/(tabs)/profile/become-tutor'
    | '/(tabs)/profile/scholarships';
  group: RowGroup;
}

const GROUP_LABELS: Record<RowGroup, string> = {
  quick: 'Quick actions',
  stuff: 'My stuff',
  tutor: 'Become a tutor',
};

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
 * Derive the saved row subtitle from the bookmark count (pending → prompt to
 * explore, so the row never renders a bare "0").
 */
function savedSubtitle(count: number | undefined): string {
  if (!count) return 'Bookmark opportunities to track them';
  return count === 1 ? '1 opportunity saved' : `${count} opportunities saved`;
}

/** Subtitle for the scholarship-tracker row — show how many the student
 *  is actively tracking so the row never renders a bare "0". */
function applicationsSubtitle(count: number | undefined): string {
  if (!count) return 'Add scholarships to track your applications';
  return count === 1 ? '1 application tracked' : `${count} applications tracked`;
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
 * "Become a Tutor" (application workflow). Grouped under three small
 * uppercase kickers ("Quick actions" / "My stuff" / "Become a tutor")
 * so the eye can land on a cluster instead of scanning one long wall.
 */
export function ProfileMenuList() {
  const colors = useTheme();
  const tints = useTints();
  const skillIdsQuery = useMySkillIds();
  const resumesQuery = useMyResumes();
  const savedQuery = useSavedOpportunityIds();
  const tutorApplicationQuery = useMyTutorApplication();
  const applicationsQuery = useMyApplications();

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
      group: 'quick',
    },
    {
      key: 'resume',
      icon: 'document-text-outline',
      tint: 'indigo',
      title: 'Resume',
      subtitle: resumeSubtitle(resumesQuery.data),
      href: '/(tabs)/portfolio',
      group: 'quick',
    },
    {
      key: 'scholarships',
      icon: 'school-outline',
      tint: 'emerald',
      title: 'Scholarship applications',
      subtitle: applicationsSubtitle(applicationsQuery.data?.length),
      href: '/(tabs)/profile/scholarships',
      group: 'stuff',
    },
    {
      key: 'saved',
      icon: 'bookmark-outline',
      tint: 'purple',
      title: 'Saved Opportunities',
      subtitle: savedSubtitle(savedQuery.data?.size),
      href: '/(tabs)/saved',
      group: 'stuff',
    },
    {
      key: 'tutor',
      icon: 'school-outline',
      tint: 'emerald',
      title: 'Become a Tutor',
      subtitle: tutorSubtitle(tutorApplicationQuery.data),
      href: '/(tabs)/profile/become-tutor',
      group: 'tutor',
    },
  ];

  // Group rows into clusters for rendering with one kicker per group.
  const groups: RowGroup[] = ['quick', 'stuff', 'tutor'];
  const groupedRows: Record<RowGroup, RowSpec[]> = {
    quick: rows.filter((r) => r.group === 'quick'),
    stuff: rows.filter((r) => r.group === 'stuff'),
    tutor: rows.filter((r) => r.group === 'tutor'),
  };

  return (
    <View style={styles.wrap}>
      {groups.map((group, groupIdx) => {
        const cluster = groupedRows[group];
        if (cluster.length === 0) return null;
        return (
          <View
            key={group}
            style={[styles.group, groupIdx > 0 && styles.groupGap]}
          >
            <ThemedText themeColor="textMuted" style={styles.kicker}>
              {GROUP_LABELS[group].toUpperCase()}
            </ThemedText>
            <View style={styles.cluster}>
              {cluster.map((row) => {
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
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  group: {
    gap: Spacing.two,
  },
  groupGap: {
    marginTop: Spacing.four - 4, // 20px breathing room between groups
  },
  kicker: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  cluster: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 17,
  },
  subtitle: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  pressed: {
    opacity: 0.85,
  },
});
