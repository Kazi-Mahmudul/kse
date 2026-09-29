import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, type TintKey } from '@/constants/theme';
import { hashString, initialsFor } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { HUB_SERVICE_TYPE_LABELS } from '@kse/shared';
import type { HubListingSummary } from '@kse/types';

import { useHubFavoriteIds, useToggleHubFavorite } from '../queries';

interface ListingCardProps {
  listing: HubListingSummary;
  /** Set inside the Saved screen (bookmark still works as remove). */
  showBookmark?: boolean;
}

/**
 * Directory listing card. Bookmark (when shown) is a SIBLING Pressable of
 * the body — never nested (RNW renders each as its own <button>).
 */
export function ListingCard({ listing, showBookmark = true }: ListingCardProps) {
  const colors = useTheme();
  const tints = useTints();
  const favorites = useHubFavoriteIds();
  const toggle = useToggleHubFavorite();

  const tintKeys = Object.keys(tints) as TintKey[];
  const tint = tints[tintKeys[hashString(listing.id) % tintKeys.length]] ?? tints.indigo;

  const isSaved = favorites.data?.has(listing.id) ?? false;
  const serviceLabel = HUB_SERVICE_TYPE_LABELS[listing.service_type];
  const location = [listing.area, listing.city].filter(Boolean).join(', ');

  const open = () =>
    router.push({ pathname: '/hub/listing/[id]', params: { id: listing.id } });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={open}
          android_ripple={{ color: colors.shadow }}
          accessibilityRole="button"
          accessibilityLabel={`${listing.name} in ${location}`}
          style={({ pressed }) => [styles.bodyPress, pressed && { opacity: 0.95 }]}
        >
          <View style={styles.imageWrap}>
            {listing.image_url ? (
              <Image
                source={{ uri: listing.image_url }}
                style={styles.image}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View
                style={[
                  styles.image,
                  styles.imageFallback,
                  { backgroundColor: tint.bg, borderColor: tint.border },
                ]}
              >
                <Text style={[styles.imageFallbackText, { color: tint.fg }]}>
                  {initialsFor(listing.name)}
                </Text>
              </View>
            )}
            {listing.verified ? (
              <View
                style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}
                accessibilityLabel="Verified listing"
              >
                <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
              </View>
            ) : null}
          </View>

          <View style={styles.body}>
            <Text
              style={[styles.title, { color: colors.heading ?? colors.text }]}
              numberOfLines={2}
            >
              {listing.name}
            </Text>
            {location ? (
              <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
                {location}
              </Text>
            ) : null}
            {listing.price_note ? (
              <Text style={[styles.price, { color: colors.bodyStrong ?? colors.text }]} numberOfLines={1}>
                {pricePrefix(listing.price_type)}
                {listing.price_note}
              </Text>
            ) : null}
            <View style={styles.chipRow}>
              <Chip backgroundColor={colors.backgroundElement} color={colors.textSecondary}>
                {serviceLabel}
              </Chip>
              {listing.has_student_discount ? (
                <Chip backgroundColor={`${colors.success}22`} color={colors.success}>
                  Student discount
                </Chip>
              ) : null}
            </View>
          </View>
        </Pressable>

        {showBookmark && (
          <Pressable
            onPress={() => toggle.mutate({ listingId: listing.id, save: !isSaved })}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save'}
            hitSlop={8}
            style={styles.bookmark}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function pricePrefix(priceType: HubListingSummary['price_type']): string {
  if (priceType === 'starting_from') return 'From ';
  if (priceType === 'approximate') return '~ ';
  return '';
}

function Chip({
  children,
  backgroundColor,
  color,
}: {
  children: string;
  backgroundColor: string;
  color: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor }]}>
      <Text style={[styles.chipText, { color }]}>{children}</Text>
    </View>
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
    alignItems: 'flex-start',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  bodyPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  imageWrap: {
    position: 'relative',
    width: 72,
    height: 72,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  imageFallbackText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
  location: {
    fontSize: 12,
    fontWeight: '500',
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
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
  bookmark: {
    alignSelf: 'flex-start',
    marginTop: -2,
  },
});
