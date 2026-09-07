import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { OpportunityCard } from '@/components/opportunity-card';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useLatestOpportunities } from '@/features/opportunities/queries';
import { useUnreadNotificationCount } from '@/features/notifications/queries';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

/**
 * Home shell — greeting, search, promo banner, latest published
 * opportunities (step 8) and the recommendations slot (step 9+).
 */
export default function HomeScreen() {
  const colors = useTheme();
  const session = useAuthStore((s) => s.session);
  const [query, setQuery] = useState('');
  const latestQuery = useLatestOpportunities(4);
  const latest = latestQuery.data ?? [];
  const unreadQuery = useUnreadNotificationCount();
  const unreadCount = unreadQuery.data ?? 0;

  const fullName = (session?.user.user_metadata?.full_name as string | undefined) ?? '';
  const firstName = fullName.trim().split(/\s+/)[0] || session?.user.email?.split('@')[0] || 'there';

  return (
    <Screen>
      <View style={styles.greeting}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            Welcome back
          </ThemedText>
          <ThemedText type="subtitle">Hi {firstName} 👋</ThemedText>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/(tabs)/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={[styles.iconButton, { backgroundColor: `${colors.primary}1A` }]}
          >
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={20}
              color={colors.primary}
            />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.danger }]} />
            )}
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/dashboard')}
            accessibilityRole="button"
            accessibilityLabel="Dashboard"
            style={[styles.iconButton, { backgroundColor: `${colors.primary}1A` }]}
          >
            <Ionicons name="grid-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() =>
          router.push({
            pathname: '/(tabs)/search',
            params: query.trim() ? { q: query.trim() } : {},
          })
        }
      />

      <Card tint="primary">
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <ThemedText type="subtitle" themeColor="onPrimary">
              Internship Opportunities
            </ThemedText>
            <ThemedText type="small" themeColor="onPrimary">
              Handpicked internships from verified organizations — find one that fits you.
            </ThemedText>
          </View>
          <PrimaryButton
            label="Browse"
            onPress={() => router.push('/(tabs)/explore/internship')}
            style={styles.bannerButton}
          />
        </View>
      </Card>

      <SectionHeader
        title="Latest opportunities"
        actionLabel="See all"
        onAction={() => router.push('/(tabs)/explore')}
      />
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

      <SectionHeader title="Recommended for you" />
      <EmptyState
        icon="sparkles-outline"
        title="Personalized picks are coming"
        message="Add your university, skills and interests to your profile and we'll match opportunities to you."
        actionLabel="Set up my profile"
        onAction={() => router.push('/(tabs)/profile')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  banner: {
    gap: Spacing.two + 4,
  },
  bannerText: {
    gap: Spacing.one,
  },
  bannerButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    minHeight: 42,
    backgroundColor: '#ffffff',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  latestList: {
    gap: Spacing.two + 2,
  },
});
