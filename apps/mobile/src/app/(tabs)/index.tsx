import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { OpportunityCard } from '@/components/opportunity-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { HomeGreeting } from '@/features/home/greeting';
import { ProfileCompletionCard } from '@/features/home/profile-completion-card';
import { PromoBanner } from '@/features/home/promo-banner';
import { QuickAccess } from '@/features/home/quick-access';
import { HomeTopBar } from '@/features/home/top-bar';
import { useUnreadNotificationCount } from '@/features/notifications/queries';
import { useLatestOpportunities } from '@/features/opportunities/queries';
import { useMyProfile } from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

/**
 * Home screen — matches design `03._home_kse`: location + notification top
 * bar, time-aware greeting, search with filter, gradient promo banner, the
 * eight-tile Quick Access grid, profile-completion recommendation, and the
 * latest published opportunities (spec §6).
 */
export default function HomeScreen() {
  const colors = useTheme();
  const session = useAuthStore((s) => s.session);
  const [query, setQuery] = useState('');

  const profileQuery = useMyProfile();
  const unreadQuery = useUnreadNotificationCount();
  const latestQuery = useLatestOpportunities(4);
  const latest = latestQuery.data ?? [];

  const metadataName = (session?.user.user_metadata?.full_name as string | undefined) ?? '';
  const displayName =
    profileQuery.data?.full_name?.trim() ||
    metadataName.trim() ||
    session?.user.email?.split('@')[0] ||
    'there';

  const openSearch = () =>
    router.push({
      pathname: '/(tabs)/search',
      params: query.trim() ? { q: query.trim() } : {},
    });

  return (
    <Screen style={styles.screen}>
      <HomeTopBar
        location={profileQuery.data?.university?.location}
        unreadCount={unreadQuery.data ?? 0}
      />

      <View style={styles.greeting}>
        <HomeGreeting name={displayName} />
      </View>

      <View style={styles.search}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={openSearch}
          onFilterPress={() => router.push('/(tabs)/search')}
          placeholder="Search anything..."
          variant="card"
        />
      </View>

      <View style={styles.banner}>
        <PromoBanner />
      </View>

      <View style={styles.section}>
        <SectionHeader
          compact
          title="Quick Access"
          actionLabel="See All"
          onAction={() => router.push('/(tabs)/explore')}
        />
      </View>
      <View style={styles.gridSpacing}>
        <QuickAccess />
      </View>

      <View style={styles.section}>
        <SectionHeader
          compact
          title="Recommended for You"
          actionLabel="See All"
          onAction={() => router.push('/(tabs)/explore')}
        />
      </View>
      <View style={styles.cardSpacing}>
        <ProfileCompletionCard />
      </View>

      <View style={styles.section}>
        <SectionHeader
          compact
          title="Latest Opportunities"
          actionLabel="See All"
          onAction={() => router.push('/(tabs)/explore')}
        />
      </View>
      <View style={styles.cardSpacing}>
        {latestQuery.isPending && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        {latestQuery.isError && (
          <EmptyState
            icon="cloud-offline-outline"
            title="Could not load opportunities"
            message={(latestQuery.error as Error).message}
            actionLabel="Try again"
            onAction={() => latestQuery.refetch()}
          />
        )}
        {latestQuery.isSuccess && latest.length === 0 && (
          <EmptyState
            icon="sparkles-outline"
            title="Nothing published yet"
            message="Verified listings are on their way — check back soon."
            actionLabel="Explore categories"
            onAction={() => router.push('/(tabs)/explore')}
          />
        )}
        <View style={styles.latestList}>
          {latest.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} showType />
          ))}
        </View>
      </View>
    </Screen>
  );
}

/**
 * The design uses a 20pt gutter and an uneven vertical rhythm
 * (12 / 16 / 20), so the screen opts out of `Screen`'s uniform 16pt gap and
 * spaces each block explicitly.
 */
const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 0,
  },
  greeting: {
    marginTop: 12,
  },
  search: {
    marginTop: 12,
  },
  banner: {
    marginTop: 16,
  },
  section: {
    marginTop: 20,
  },
  gridSpacing: {
    marginTop: 12,
  },
  cardSpacing: {
    marginTop: 10,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  latestList: {
    gap: 10,
  },
});
