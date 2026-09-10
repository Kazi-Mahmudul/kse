import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ProfileHero } from '@/features/profile/components/profile-hero';
import { ProfileMenuList } from '@/features/profile/components/profile-menu-list';
import { ProfileNavBar } from '@/features/profile/components/profile-nav-bar';
import { ProfileStatsStrip } from '@/features/profile/components/profile-stats-strip';
import { PortfolioGrid } from '@/features/profile/components/portfolio-grid';
import { useMyProfile } from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * Profile tab — matches the design at
 * `~/Downloads/stitch_ui_clone_design_specifications/05._profile_kse/`:
 * centred nav + hero, three-up stats strip, full-width Edit Profile CTA,
 * four-tile portfolio grid, two-row menu list. Loading + error states stay
 * (CLAUDE.md §37) so a slow RLS read doesn't render a half-drawn hero.
 */
export default function ProfileScreen() {
  const colors = useTheme();
  const profileQuery = useMyProfile();

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
          onAction={() => {
            void profileQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ProfileNavBar />
      <ProfileHero />
      <ProfileStatsStrip />
      <PrimaryButton
        label="Edit Profile"
        onPress={() => router.push('/(tabs)/profile/settings')}
      />
      <PortfolioGrid />
      <ProfileMenuList />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
