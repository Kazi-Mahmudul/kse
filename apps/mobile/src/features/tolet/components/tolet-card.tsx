import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BookmarkButton } from '@/components/bookmark-button';
import { Spacing, type TintKey } from '@/constants/theme';
import { hashString, initialsFor } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { TOLET_LISTING_STATUS_LABELS, TOLET_ROOM_TYPE_LABELS } from '@kse/shared';
import type { ToletListingSummary } from '@kse/types';

interface ToletCardProps {
  listing: ToletListingSummary;
}

/**
 * Bachelor To-Let hub card (spec bachelor-to-let §Discovery).
 *
 * Horizontal layout: hero image (or tinted fallback) on the left, listing info
 * on the right. Verified badge overlays the top-right of the image. Bookmark
 * is a sibling of the body Pressable (NOT nested) so RNW renders each as a
 * separate `<button>` — same rule as the scholarship card (project memory:
 * "card + inner action must be sibling Pressables").
 */
export function ToletCard({ listing }: ToletCardProps) {
  const colors = useTheme();
  const tints = useTints();
  const tintKeys = Object.keys(tints) as TintKey[];
  const tintKey =
    tintKeys[hashString(listing.id) % tintKeys.length] ?? 'indigo';
  const tint = tints[tintKey];

  const heroImage = listing.image_urls?.[0] ?? listing.image_url;
  const rent = formatRent(listing.rent_amount, listing.rent_currency);
  const roomLabel = listing.room_type ? TOLET_ROOM_TYPE_LABELS[listing.room_type] : null;
  const location = [listing.area, listing.city].filter(Boolean).join(', ')
    || listing.location
    || '';
  const listingStatusLabel = TOLET_LISTING_STATUS_LABELS[listing.listing_status];
  const isFull = listing.listing_status === 'full';
  const isUnavailable = listing.listing_status === 'unavailable';

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/tolet/[id]',
      params: { id: listing.id },
    });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
        (isFull || isUnavailable) && { opacity: 0.7 },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={open}
          android_ripple={{ color: colors.shadow }}
          accessibilityRole="button"
          accessibilityLabel={`${listing.title} in ${location}`}
          style={({ pressed }) => [
            styles.bodyPress,
            pressed && { opacity: 0.95 },
          ]}
        >
          <View style={styles.imageWrap}>
            {heroImage ? (
              <Image
                source={{ uri: heroImage }}
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
                  {initialsFor(listing.title)}
                </Text>
              </View>
            )}
            {listing.verified ? (
              <View
                style={[
                  styles.verifiedBadge,
                  { backgroundColor: colors.primary },
                ]}
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
              {listing.title}
            </Text>
            {location ? (
              <Text
                style={[styles.location, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {location}
              </Text>
            ) : null}
            {rent ? (
              <Text
                style={[styles.rent, { color: colors.bodyStrong ?? colors.text }]}
                numberOfLines={1}
              >
                {rent}
              </Text>
            ) : null}
            <View style={styles.chipRow}>
              {roomLabel ? (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: colors.backgroundElement },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: colors.textSecondary }]}
                  >
                    {roomLabel}
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.chip,
                  { backgroundColor: statusBg(listing.listing_status, colors) },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: statusFg(listing.listing_status, colors) }]}
                >
                  {listingStatusLabel}
                </Text>
              </View>
              {listing.available_rooms != null
                && listing.total_rooms != null
                && listing.total_rooms > 1 ? (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: colors.backgroundElement },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: colors.textSecondary }]}
                  >
                    {listing.available_rooms}/{listing.total_rooms} beds
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>

        <View style={styles.bookmark}>
          <BookmarkButton id={listing.id} kind="tolet" variant="icon" />
        </View>
      </View>
    </View>
  );
}

function formatRent(
  amount: number | null,
  currency: string | null,
): string | null {
  if (amount == null || !currency) return null;
  const formatted = new Intl.NumberFormat('en-IN').format(amount);
  return `${currency} ${formatted}/month`;
}

function statusBg(
  status: ToletListingSummary['listing_status'],
  colors: ReturnType<typeof useTheme>,
): string {
  switch (status) {
    case 'available':
      return `${colors.success}22`;
    case 'almost_full':
      return `${colors.warning}33`;
    case 'full':
      return `${colors.danger}22`;
    case 'unavailable':
      return colors.backgroundElement;
  }
}

function statusFg(
  status: ToletListingSummary['listing_status'],
  colors: ReturnType<typeof useTheme>,
): string {
  switch (status) {
    case 'available':
      return colors.success;
    case 'almost_full':
      return colors.warning;
    case 'full':
      return colors.danger;
    case 'unavailable':
      return colors.textSecondary;
  }
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
    width: 96,
    height: 96,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 14,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  imageFallbackText: {
    fontSize: 28,
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
  rent: {
    fontSize: 14,
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
  bookmark: {
    alignSelf: 'flex-start',
    marginTop: -2,
  },
});
