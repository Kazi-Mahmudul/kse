import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';

import { BackHeader } from '@/components/back-header';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { ResearchCard } from '@/features/hub/components/research-card';
import { useResearchFeed } from '@/features/hub/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { blurActiveElement } from '@/lib/focus';
import { RESEARCH_COLLABORATION_LABELS } from '@kse/shared';
import { KHULNA_DIVISION_DISTRICTS, type ResearchCollaborationType } from '@kse/types';

/** Research partner discovery (spec student-hub §11). */
export default function ResearchPartnersScreen() {
  const colors = useTheme();
  const [rawQuery, setRawQuery] = useState('');
  const q = useDebouncedValue(rawQuery, 300);
  const [collaboration, setCollaboration] = useState<ResearchCollaborationType | null>(null);
  const [district, setDistrict] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      q: q || undefined,
      collaboration: collaboration ?? undefined,
      district: district ?? undefined,
    }),
    [q, collaboration, district],
  );

  const feed = useResearchFeed(filters);
  const rows = useMemo(() => feed.data?.pages.flatMap((p) => p.rows) ?? [], [feed.data]);
  const hasAnyFilter = Boolean(q || collaboration || district);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="Research Partners" />

      <SearchBar
        value={rawQuery}
        onChangeText={setRawQuery}
        placeholder="Search research interest, topic, skill…"
        variant="card"
        onSubmitEditing={blurActiveElement}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroller}
      >
        {(Object.keys(RESEARCH_COLLABORATION_LABELS) as ResearchCollaborationType[])
          .filter((c) => c !== 'any')
          .map((value) => (
            <Chip
              key={value}
              label={RESEARCH_COLLABORATION_LABELS[value]}
              selected={collaboration === value}
              onPress={() => setCollaboration(collaboration === value ? null : value)}
            />
          ))}
        {KHULNA_DIVISION_DISTRICTS.slice(0, 10).map((d) => (
          <Chip
            key={d}
            label={d}
            selected={district === d}
            onPress={() => setDistrict(district === d ? null : d)}
          />
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton
          label="My research profile"
          variant="outline"
          size="compact"
          onPress={() => router.push('/hub/research/my-profile')}
        />
      </View>

      {feed.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : feed.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load research partners"
          message={(feed.error as Error).message}
          actionLabel="Try again"
          onAction={() => feed.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="flask-outline"
          title="No research partners found"
          message={
            hasAnyFilter
              ? 'Try a broader research topic or discipline.'
              : 'No research profiles yet — create yours to get started.'
          }
          actionLabel={hasAnyFilter ? 'Clear filters' : 'Create my profile'}
          onAction={
            hasAnyFilter
              ? () => {
                  setCollaboration(null);
                  setDistrict(null);
                  setRawQuery('');
                }
              : () => router.push('/hub/research/my-profile')
          }
        />
      ) : (
        <View style={styles.list}>
          {rows.map((profile) => (
            <ResearchCard key={profile.id} profile={profile} />
          ))}
          {feed.hasNextPage ? (
            <PrimaryButton
              label="Load more"
              variant="outline"
              onPress={() => feed.fetchNextPage()}
              loading={feed.isFetchingNextPage}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    gap: Spacing.one + 2,
    paddingVertical: Spacing.two,
  },
  // react-native-web gives ScrollViews flexGrow:1 — neutralise it so this
  // one-line row can't balloon and push the feed to the bottom.
  chipScroller: {
    flexGrow: 0,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.two,
  },
  list: {
    gap: Spacing.two + 2,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
});
