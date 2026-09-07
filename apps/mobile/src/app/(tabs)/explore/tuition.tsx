import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

import { BackHeader } from '@/components/back-header';
import { TutorCard } from '@/components/tutor-card';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { Spacing } from '@/constants/theme';
import { useSubjects, useTutorFeed } from '@/features/tuition/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';

/**
 * Tuition discovery (step 15, spec §6): search + subject chips over verified,
 * active tutors. Requests go through a contact form — no marketplace payments.
 */
export default function TuitionScreen() {
  const colors = useTheme();
  const [text, setText] = useState('');
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const debouncedText = useDebouncedValue(text, 300);

  const q = debouncedText.trim() || undefined;
  const query = useTutorFeed({ q, subjectId });
  const subjectsQuery = useSubjects();
  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];
  const hasCriteria = Boolean(q || subjectId);

  const clearAll = () => {
    setText('');
    setSubjectId(undefined);
  };

  return (
    <Screen>
      <BackHeader title="Tuition & Tutors" />
      <SearchBar
        value={text}
        onChangeText={setText}
        placeholder="Search by subject, headline or area…"
      />

      {subjectsQuery.data && subjectsQuery.data.length > 0 && (
        <View style={styles.chipRow}>
          <Chip
            label="All subjects"
            selected={!subjectId}
            onPress={() => setSubjectId(undefined)}
          />
          {subjectsQuery.data.map((subject) => (
            <Chip
              key={subject.id}
              label={subject.name}
              selected={subjectId === subject.id}
              onPress={() =>
                setSubjectId((current) =>
                  current === subject.id ? undefined : subject.id,
                )
              }
            />
          ))}
        </View>
      )}

      <View style={styles.metaRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {rows.length}+ verified {rows.length === 1 ? 'tutor' : 'tutors'}
        </ThemedText>
        <Chip
          label="My requests"
          selected={false}
          onPress={() => router.push('/(tabs)/tuition-requests')}
        />
        {query.isFetching && !query.isFetchingNextPage && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {query.isPending && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {query.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load tutors"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      )}

      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon="book-outline"
          title={hasCriteria ? 'No tutors match' : 'No tutors listed yet'}
          message={
            hasCriteria
              ? 'Try a different subject or clear the search.'
              : 'Verified tutors are added as they join KSE.'
          }
          actionLabel={hasCriteria ? 'Clear filters' : 'Refresh'}
          onAction={hasCriteria ? clearAll : () => query.refetch()}
        />
      )}

      {rows.length > 0 && (
        <View style={styles.list}>
          {rows.map((tutor) => (
            <TutorCard key={tutor.id} tutor={tutor} />
          ))}
        </View>
      )}

      {query.hasNextPage && (
        <PrimaryButton
          label={query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          loading={query.isFetchingNextPage}
          onPress={() => query.fetchNextPage()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  metaRow: {
    minHeight: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  list: {
    gap: Spacing.two + 2,
  },
});
