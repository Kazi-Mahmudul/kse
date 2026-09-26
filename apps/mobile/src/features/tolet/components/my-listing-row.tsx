import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ToletListingStatus, ToletListingSummary } from '@kse/types';
import { TOLET_LISTING_STATUS_LABELS } from '@kse/shared';

interface MyListingRowProps {
  listing: ToletListingSummary;
  onOpen: () => void;
  onWithdraw: () => void;
}

/**
 * One row on the "My To-Let listings" screen (spec bachelor-to-let §Owner).
 *
 * Renders:
 *   - Hero thumbnail (sibling Pressable → opens detail)
 *   - Title + status + listing-status chip stack
 *   - Sibling action buttons (open detail / withdraw)
 *
 * Uses the sibling-not-nested pressable pattern from project memory — RNW
 * renders button-role Pressables as real `<button>` so nesting one inside
 * another breaks both targets.
 */
export function MyListingRow({ listing, onOpen, onWithdraw }: MyListingRowProps) {
  const colors = useTheme();
  const cover = listing.image_urls?.[0] ?? listing.image_url ?? null;
  const location = [listing.area, listing.city].filter(Boolean).join(', ');
  const rent =
    listing.rent_amount != null && listing.rent_currency
      ? `${listing.rent_currency} ${new Intl.NumberFormat('en-IN').format(listing.rent_amount)}/mo`
      : null;

  // `status` is the workflow gate (draft / pending_review / published /
  // rejected / archived). `listing_status` is the room availability.
  const workflowStatus = listing.status as
    | 'draft'
    | 'pending_review'
    | 'published'
    | 'rejected'
    | 'archived'
    | 'expired';
  const workflowLabel =
    workflowStatus === 'pending_review'
      ? 'Pending review'
      : workflowStatus === 'published'
        ? 'Published'
        : workflowStatus === 'rejected'
          ? 'Rejected'
          : workflowStatus === 'archived'
            ? 'Archived'
            : workflowStatus === 'expired'
              ? 'Expired'
              : 'Draft';

  const canWithdraw = workflowStatus === 'draft' || workflowStatus === 'pending_review';

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`View ${listing.title}`}
          hitSlop={6}
          style={({ pressed }) => [pressed && styles.thumbPressed, styles.thumb]}
        >
          {cover ? (
            <Image source={{ uri: cover }} style={styles.thumbImage} contentFit="cover" />
          ) : (
            <View style={[styles.thumbImage, styles.thumbFallback, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="home" size={22} color={colors.textSecondary} />
            </View>
          )}
        </Pressable>

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {listing.title}
          </Text>
          {location ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {location}
            </Text>
          ) : null}
          {rent ? (
            <Text style={[styles.rent, { color: colors.primary }]}>{rent}</Text>
          ) : null}

          <View style={styles.chipRow}>
            <View style={[styles.chip, workflowChipStyle(workflowStatus, colors)]}>
              <Text style={[styles.chipText, { color: workflowChipFg(workflowStatus, colors) }]}>
                {workflowLabel}
              </Text>
            </View>
            {workflowStatus === 'published' ? (
              <View style={[styles.chip, listingChipStyle(listing.listing_status, colors)]}>
                <Text
                  style={[styles.chipText, { color: listingChipFg(listing.listing_status, colors) }]}
                >
                  {TOLET_LISTING_STATUS_LABELS[listing.listing_status]}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onOpen}
              accessibilityRole="button"
              accessibilityLabel="Open listing"
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.primary + '22' },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="open-outline" size={14} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Open</Text>
            </Pressable>
            {canWithdraw ? (
              <Pressable
                onPress={onWithdraw}
                accessibilityRole="button"
                accessibilityLabel="Withdraw listing"
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: `${colors.danger}22` },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>Withdraw</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

function workflowChipStyle(
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived' | 'expired',
  colors: ReturnType<typeof useTheme>,
) {
  switch (status) {
    case 'published':
      return { backgroundColor: `${colors.success}22` };
    case 'pending_review':
      return { backgroundColor: `${colors.warning}33` };
    case 'rejected':
    case 'expired':
      return { backgroundColor: `${colors.danger}22` };
    default:
      return { backgroundColor: colors.backgroundElement };
  }
}

function workflowChipFg(
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived' | 'expired',
  colors: ReturnType<typeof useTheme>,
) {
  switch (status) {
    case 'published':
      return colors.success;
    case 'pending_review':
      return colors.warning;
    case 'rejected':
    case 'expired':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}

function listingChipStyle(status: ToletListingStatus, colors: ReturnType<typeof useTheme>) {
  switch (status) {
    case 'available':
      return { backgroundColor: `${colors.success}22` };
    case 'almost_full':
      return { backgroundColor: `${colors.warning}33` };
    case 'full':
      return { backgroundColor: `${colors.danger}22` };
    default:
      return { backgroundColor: colors.backgroundElement };
  }
}

function listingChipFg(status: ToletListingStatus, colors: ReturnType<typeof useTheme>) {
  switch (status) {
    case 'available':
      return colors.success;
    case 'almost_full':
      return colors.warning;
    case 'full':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbPressed: {
    opacity: 0.7,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  rent: {
    fontSize: 13,
    fontWeight: '700',
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
