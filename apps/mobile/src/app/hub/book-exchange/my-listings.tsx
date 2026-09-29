import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useMyBookListings, useSetBookListingStatus } from '@/features/hub/queries';
import { useTheme } from '@/hooks/use-theme';
import { confirmDialog } from '@/lib/confirm';
import { BOOK_INTENT_LABELS, BOOK_STATUS_LABELS } from '@kse/shared';
import type { BookListingSummary } from '@kse/types';

/** Manage my Book Exchange listings (spec student-hub §10). */
export default function MyBookListingsScreen() {
  const colors = useTheme();
  const { data: books, isPending, isError, error, refetch } = useMyBookListings();
  const setStatus = useSetBookListingStatus();

  const mark = (book: BookListingSummary, status: BookListingSummary['status']) => {
    const label = BOOK_STATUS_LABELS[status].toLowerCase();
    confirmDialog({
      title: `Mark as ${label}?`,
      message: `"${book.title}" will be marked as ${label}.`,
      confirmLabel: 'Confirm',
    })
      .then((yes) => {
        if (yes) setStatus.mutate({ id: book.id, status });
      })
      .catch(() => undefined);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="My book listings" />

      {isPending ? (
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Loading…
        </ThemedText>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load your listings"
          message={(error as Error).message}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : (books ?? []).length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="No listings yet"
          message="Post your first book to exchange, sell or give away."
          actionLabel="Post a book"
          onAction={() => router.push('/hub/book-exchange/post')}
        />
      ) : (
        <View style={styles.list}>
          {(books ?? []).map((book) => {
            const isActive = book.status === 'active';
            return (
              <View
                key={book.id}
                style={[
                  styles.row,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                {book.image_urls[0] ? (
                  <Image source={{ uri: book.image_urls[0] }} style={styles.cover} contentFit="cover" />
                ) : (
                  <View
                    style={[
                      styles.cover,
                      { backgroundColor: colors.backgroundElement, alignItems: 'center', justifyContent: 'center' },
                    ]}
                  >
                    <Ionicons name="book-outline" size={22} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.rowBody}>
                  <ThemedText type="default" style={{ fontWeight: '700' }} numberOfLines={1}>
                    {book.title}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {BOOK_INTENT_LABELS[book.intent]}
                    {book.intent === 'sell' && book.price != null
                      ? ` · BDT ${(book.price / 100).toLocaleString('en-IN')}`
                      : ''}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: book.status === 'active' ? colors.success : colors.warning }}
                  >
                    {BOOK_STATUS_LABELS[book.status]}
                  </ThemedText>
                  <View style={styles.rowActions}>
                    <ActionPill
                      icon="create-outline"
                      label="Edit"
                      onPress={() =>
                        router.push(`/hub/book-exchange/post?id=${book.id}` as never)
                      }
                    />
                    {isActive ? (
                      <>
                        <ActionPill
                          icon="swap-horizontal-outline"
                          label="Exchanged"
                          onPress={() => mark(book, 'exchanged')}
                        />
                        {book.intent === 'sell' ? (
                          <ActionPill
                            icon="cash-outline"
                            label="Sold"
                            onPress={() => mark(book, 'sold')}
                          />
                        ) : null}
                        <ActionPill
                          icon="bookmark-outline"
                          label="Reserve"
                          onPress={() => mark(book, 'reserved')}
                        />
                      </>
                    ) : null}
                    {book.status !== 'removed' ? (
                      <ActionPill
                        icon="trash-outline"
                        label="Remove"
                        onPress={() => mark(book, 'removed')}
                      />
                    ) : (
                      <ActionPill
                        icon="refresh-outline"
                        label="Re-list"
                        onPress={() => mark(book, 'active')}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function ActionPill({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionPill,
        { backgroundColor: colors.backgroundElement, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={13} color={colors.primary} />
      <ThemedText type="small" style={{ color: colors.primary, fontWeight: '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two + 2,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
  },
  cover: {
    width: 56,
    height: 76,
    borderRadius: 8,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
