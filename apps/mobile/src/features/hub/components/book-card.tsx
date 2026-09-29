import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, type TintKey } from '@/constants/theme';
import { hashString, initialsFor } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { BOOK_CONDITION_LABELS, BOOK_INTENT_LABELS, BOOK_STATUS_LABELS } from '@kse/shared';
import type { BookListingSummary } from '@kse/types';

/** Book Exchange listing card — product/listing style (spec student-hub §32). */
export function BookCard({ book }: { book: BookListingSummary }) {
  const colors = useTheme();
  const tints = useTints();
  const tintKeys = Object.keys(tints) as TintKey[];
  const tint = tints[tintKeys[hashString(book.id) % tintKeys.length]] ?? tints.indigo;

  const cover = book.image_urls?.[0];
  const price =
    book.intent === 'sell' && book.price != null
      ? `BDT ${(book.price / 100).toLocaleString('en-IN')}`
      : BOOK_INTENT_LABELS[book.intent];

  const open = () =>
    router.push({ pathname: '/hub/book-exchange/[id]', params: { id: book.id } });

  return (
    <Pressable
      onPress={open}
      android_ripple={{ color: colors.shadow }}
      accessibilityRole="button"
      accessibilityLabel={`${book.title} — ${price}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.row}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={150} />
        ) : (
          <View
            style={[
              styles.cover,
              styles.coverFallback,
              { backgroundColor: tint.bg, borderColor: tint.border },
            ]}
          >
            <Ionicons name="book-outline" size={24} color={tint.fg} />
            <Text style={[styles.coverFallbackText, { color: tint.fg }]} numberOfLines={1}>
              {initialsFor(book.title)}
            </Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.heading ?? colors.text }]} numberOfLines={2}>
            {book.title}
          </Text>
          {book.author ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {book.author}
            </Text>
          ) : null}
          <Text style={[styles.price, { color: colors.bodyStrong ?? colors.text }]}>{price}</Text>
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                {BOOK_CONDITION_LABELS[book.condition]}
              </Text>
            </View>
            {book.status !== 'active' ? (
              <View style={[styles.chip, { backgroundColor: `${colors.warning}33` }]}>
                <Text style={[styles.chipText, { color: colors.warning }]}>
                  {BOOK_STATUS_LABELS[book.status]}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cover: {
    width: 64,
    height: 88,
    borderRadius: 10,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 4,
  },
  coverFallbackText: {
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
