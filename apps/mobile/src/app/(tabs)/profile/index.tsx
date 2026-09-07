import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/service';
import { profileCompletion } from '@/features/profile/completion';
import {
  useMyProfile,
  useMySkillIds,
  useSkills,
} from '@/features/profile/queries';
import {
  useMyAchievements,
  useMyCertificates,
  useMyPortfolioLinks,
  useMyProjects,
  useMyResearch,
  useMyResumes,
} from '@/features/portfolio/queries';
import { useSavedOpportunityIds } from '@/features/saved/queries';
import { ACADEMIC_LEVEL_LABELS } from '@kse/shared';
import { useTheme } from '@/hooks/use-theme';
import type { IconName } from '@/types/icon';
import { useAuthStore } from '@/store/auth-store';

/** Profile tab — live profile data, completion score, portfolio slot (step 18). */
export default function ProfileScreen() {
  const colors = useTheme();
  const email = useAuthStore((s) => s.session?.user.email) ?? '';
  const profileQuery = useMyProfile();
  const skillIdsQuery = useMySkillIds();
  const skillsQuery = useSkills();
  const savedQuery = useSavedOpportunityIds();

  const projectsQ = useMyProjects();
  const certificatesQ = useMyCertificates();
  const achievementsQ = useMyAchievements();
  const researchQ = useMyResearch();
  const resumesQ = useMyResumes();
  const linksQ = useMyPortfolioLinks();

  const portfolioCount =
    (projectsQ.data?.length ?? 0) +
    (certificatesQ.data?.length ?? 0) +
    (achievementsQ.data?.length ?? 0) +
    (researchQ.data?.length ?? 0) +
    (resumesQ.data?.length ?? 0) +
    (linksQ.data?.length ?? 0);

  if (profileQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (profileQuery.isError) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load your profile"
          message={(profileQuery.error as Error).message}
          actionLabel="Try again"
          onAction={() => profileQuery.refetch()}
        />
      </Screen>
    );
  }

  const profile = profileQuery.data;
  const fullName = profile.full_name?.trim() || 'Student';
  const skillIds = skillIdsQuery.data ?? [];
  const mySkills = (skillsQuery.data ?? []).filter((s) => skillIds.includes(s.id));
  const completion = profileCompletion(profile, skillIds.length);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <ThemedText type="subtitle" themeColor="onPrimary">
            {fullName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.identity}>
          <ThemedText type="subtitle">{fullName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {email}
          </ThemedText>
        </View>
        <Badge label="Student" tone="success" />
      </View>

      <Card>
        <View style={styles.completionHeader}>
          <View>
            <ThemedText type="smallBold">Profile score</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {completion}% complete — better matches await
            </ThemedText>
          </View>
          <ThemedText type="subtitle" themeColor="primary">
            {completion}%
          </ThemedText>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
          <View
            style={[styles.progressFill, { backgroundColor: colors.primary, width: `${completion}%` }]}
          />
        </View>
        <PrimaryButton
          label={completion < 100 ? 'Complete my profile' : 'Edit profile'}
          onPress={() => router.push('/(tabs)/profile/edit')}
          style={styles.editButton}
        />
      </Card>

      <SectionHeader title="About" />
      <Card>
        <InfoRow
          icon="school-outline"
          label="University"
          value={profile.university?.name ?? null}
        />
        <InfoRow
          icon="library-outline"
          label="Department"
          value={profile.department?.name ?? null}
        />
        <InfoRow
          icon="ribbon-outline"
          label="Level"
          value={profile.academic_level ? ACADEMIC_LEVEL_LABELS[profile.academic_level] : null}
        />
        <InfoRow icon="call-outline" label="Phone" value={profile.phone} />
        <InfoRow
          icon="chatbubble-outline"
          label="Bio"
          value={profile.bio?.trim() ? profile.bio : null}
        />
      </Card>

      <SectionHeader
        title="Skills"
        actionLabel="Edit"
        onAction={() => router.push('/(tabs)/profile/edit')}
      />
      {mySkills.length > 0 ? (
        <View style={styles.chips}>
          {mySkills.map((skill) => (
            <Chip key={skill.id} label={skill.name} selected />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="flash-outline"
          title="No skills added yet"
          message="Add your skills to get matched with relevant opportunities."
          actionLabel="Add skills"
          onAction={() => router.push('/(tabs)/profile/edit')}
        />
      )}

      <SectionHeader title="Quick links" />
      <Card onPress={() => router.push('/(tabs)/dashboard')}>
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}1A` }]}>
            <Ionicons name="grid-outline" size={16} color={colors.primary} />
          </View>
          <View style={styles.infoText}>
            <ThemedText type="smallBold">My dashboard</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Completion, deadlines and communities at a glance
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </Card>
      <Card onPress={() => router.push('/(tabs)/saved')}>
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}1A` }]}>
            <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
          </View>
          <View style={styles.infoText}>
            <ThemedText type="smallBold">Saved opportunities</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {savedQuery.data
                ? `${savedQuery.data.size} ${savedQuery.data.size === 1 ? 'bookmark' : 'bookmarks'}`
                : 'Your bookmarked listings'}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </Card>

      <SectionHeader
        title="My portfolio"
        actionLabel={portfolioCount === 0 ? 'Build' : 'Manage'}
        onAction={() => router.push('/(tabs)/portfolio')}
      />
      <Card onPress={() => router.push('/(tabs)/portfolio')}>
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}1A` }]}>
            <Ionicons name="folder-open-outline" size={16} color={colors.primary} />
          </View>
          <View style={styles.infoText}>
            <ThemedText type="smallBold">
              {portfolioCount === 0
                ? 'Your portfolio is empty'
                : `${portfolioCount} portfolio ${portfolioCount === 1 ? 'item' : 'items'}`}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Projects, certificates, achievements, research, resumes and links
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </Card>

      <PrimaryButton
        label="Sign out"
        variant="outline"
        onPress={() => {
          void signOut();
        }}
      />
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string | null;
}) {
  const colors = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}1A` }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold">{value ?? 'Not set'}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  editButton: {
    marginTop: Spacing.three,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
