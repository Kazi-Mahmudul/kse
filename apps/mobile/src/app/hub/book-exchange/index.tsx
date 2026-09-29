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
import { BookCard } from '@/features/hub/components/book-card';
import { useBookFeed } from '@/features/hub/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { blurActiveElement } from '@/lib/focus';
import { BOOK_CONDITION_LABELS, BOOK_INTENT_LABELS } from '@kse/shared';
import type { BookCondition, BookIntent } from '@kse/types';

/** Book Exchange Corner feed (spec student-hub §10). */
export default function BookExchangeScreen() {
  const colors = useTheme();
  const [rawQuery, setRawQuery] = useState('');
  const q = useDebouncedValue(rawQuery, 300);
  const [intent, setIntent] = useState<BookIntent | null>(null);
  const [condition, setCondition] = useState<BookCondition | null>(null);

  const filters = useMemo(
    () => ({
      q: q || undefined,
      intent: intent ?? undefined,
      condition: condition ?? undefined,
    }),
    [q, intent, condition],
  );

  const feed = useBookFeed(filters);
  const rows = useMemo(() => feed.data?.pages.flatMap((p) => p.rows) ?? [], [feed.data]);
  const hasAnyFilter = Boolean(q || intent || condition);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="Book Exchange Corner" />

      <SearchBar
        value={rawQuery}
        onChangeText={setRawQuery}
        placeholder="Search books…"
        variant="card"
        onSubmitEditing={blurActiveElement}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {(Object.keys(BOOK_INTENT_LABELS) as BookIntent[]).map((value) => (
          <Chip
            key={value}
            label={BOOK_INTENT_LABELS[value]}
            selected={intent === value}
            onPress={() => setIntent(intent === value ? null : value)}
          />
        ))}
        {(Object.keys(BOOK_CONDITION_LABELS) as BookCondition[]).map((value) => (
          <Chip
            key={value}
            label={BOOK_CONDITION_LABELS[value]}
            selected={condition === value}
            onPress={() => setCondition(condition === value ? null : value)}
          />
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton
          label="My listings"
          variant="outline"
          size="compact"
          onPress={() => router.push('/hub/book-exchange/my-listings')}
        />
        <PrimaryButton
          label="Post a book"
          size="compact"
          onPress={() => router.push('/hub/book-exchange/post')}
        />
      </View>

      {feed.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : feed.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load books"
          message={(feed.error as Error).message}
          actionLabel="Try again"
          onAction={() => feed.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="No books found"
          message={
            hasAnyFilter
              ? 'Try clearing the filters to see every available book.'
              : 'No books listed yet — post the first one.'
          }
          actionLabel={hasAnyFilter ? 'Clear filters' : 'Post a book'}
          onAction={
            hasAnyFilter
              ? () => {
                  setIntent(null);
                  setCondition(null);
                  setRawQuery('');
                }
              : () => router.push('/hub/book-exchange/post')
          }
        />
      ) : (
        <View style={styles.list}>
          {rows.map((book) => (
            <BookCard key={book.id} book={book} />
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
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
