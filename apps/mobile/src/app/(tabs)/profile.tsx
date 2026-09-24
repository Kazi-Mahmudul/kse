import { ActivityIndicator, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ProfileHealthCard } from '@/features/profile/components/profile-health-card';
import { ProfileHero } from '@/features/profile/components/profile-hero';
import { ProfileMenuList } from '@/features/profile/components/profile-menu-list';
import { ProfileNavBar } from '@/features/profile/components/profile-nav-bar';
import { PortfolioGrid } from '@/features/profile/components/portfolio-grid';
import { useMyProfile } from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * Profile tab — matches the design at
 * `~/Downloads/stitch_ui_clone_design_specifications/05._profile_kse/`:
 * centred nav + tinted hero card, gradient Profile Health card (with
 * completion ring + Saved/Achievements counts + first-missing-field
 * hint + "Improve Profile" pill), 4-tile portfolio grid that
 * deep-links to the matching portfolio section, and the menu list
 * grouped into three clusters (Quick actions / My stuff / Become a
 * tutor). Loading + error states stay (CLAUDE.md §37) so a slow RLS
 * read doesn't render a half-drawn hero.
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
      <ProfileHealthCard />
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
