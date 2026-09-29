import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { Spacing } from '@/constants/theme';
import { BookCard } from '@/features/hub/components/book-card';
import { ListingCard } from '@/features/hub/components/listing-card';
import { ResearchCard } from '@/features/hub/components/research-card';
import { useBookFeed, useHubFeed, useResearchFeed } from '@/features/hub/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { blurActiveElement } from '@/lib/focus';

/**
 * Global Student Hub search (spec student-hub §8): one debounced query
 * across directory listings, book exchange and research partners.
 * Each source paginates server-side; we show the first page per source.
 */
export default function HubSearchScreen() {
  const colors = useTheme();
  const [rawQuery, setRawQuery] = useState('');
  const q = useDebouncedValue(rawQuery, 300);

  const enabled = q.trim().length >= 2;

  const listingFeed = useHubFeed({ q: enabled ? q : undefined });
  const bookFeed = useBookFeed({ q: enabled ? q : undefined });
  const researchFeed = useResearchFeed({ q: enabled ? q : undefined });

  const listings = useMemo(
    () => listingFeed.data?.pages.flatMap((p) => p.rows) ?? [],
    [listingFeed.data],
  );
  const books = useMemo(() => bookFeed.data?.pages.flatMap((p) => p.rows) ?? [], [bookFeed.data]);
  const profiles = useMemo(
    () => researchFeed.data?.pages.flatMap((p) => p.rows) ?? [],
    [researchFeed.data],
  );

  const nothing =
    enabled &&
    listingFeed.isSuccess &&
    bookFeed.isSuccess &&
    researchFeed.isSuccess &&
    listings.length === 0 &&
    books.length === 0 &&
    profiles.length === 0;

  const searching =
    enabled && (listingFeed.isFetching || bookFeed.isFetching || researchFeed.isFetching);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="Search Student Hub" />
      <SearchBar
        value={rawQuery}
        onChangeText={setRawQuery}
        placeholder="Search services, shops, books, research…"
        variant="card"
        autoFocus
        onSubmitEditing={blurActiveElement}
      />

      {!enabled ? (
        <EmptyState
          icon="search-outline"
          title="Search everything in Student Hub"
          message='Try "laundry", "bookshop", a book title or a research topic.'
        />
      ) : searching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : nothing ? (
        <EmptyState
          icon="search-outline"
          title="No results"
          message="Try a different keyword or a shorter query."
        />
      ) : (
        <View style={styles.results}>
          {listings.length > 0 ? (
            <View style={styles.group}>
              <SectionTitle title={`Places & services (${listings.length})`} />
              {listings.slice(0, 5).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </View>
          ) : null}

          {books.length > 0 ? (
            <View style={styles.group}>
              <SectionTitle title={`Books (${books.length})`} />
              {books.slice(0, 5).map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </View>
          ) : null}

          {profiles.length > 0 ? (
            <View style={styles.group}>
              <SectionTitle title={`Research partners (${profiles.length})`} />
              {profiles.slice(0, 5).map((profile) => (
                <ResearchCard key={profile.id} profile={profile} />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function SectionTitle({ title }: { title: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.sectionBar, { borderColor: colors.border }]}>
      <ThemedText type="smallBold" style={{ color: colors.heading ?? colors.text }}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  results: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.two + 2,
  },
  sectionBar: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.one + 2,
  },
});
