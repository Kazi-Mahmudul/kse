import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { Spacing, type TintKey } from '@/constants/theme';
import { HubReportSheet } from '@/features/hub/components/report-sheet';
import { isOpenNow, sanitizeSearchQuery } from '@/features/hub/service';
import { useHubFavoriteIds, useHubListing, useToggleHubFavorite } from '@/features/hub/queries';
import { hashString, initialsFor } from '@/lib/format';
import { alertDialog, confirmDialog } from '@/lib/confirm';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { HUB_PRICE_TYPE_LABELS } from '@kse/shared';

/**
 * Listing details (spec student-hub §6): everything the row carries, and
 * only the actions the data supports — no fake contacts or links.
 */
export default function HubListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const tints = useTints();
  const [reportVisible, setReportVisible] = useState(false);

  const { data: listing, isPending, isError, error, refetch } = useHubListing(id ?? '');
  const favorites = useHubFavoriteIds();
  const toggle = useToggleHubFavorite();

  if (isPending) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackHeader title="Listing" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (isError || !listing) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackHeader title="Listing" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load this listing"
          message={(error as Error)?.message ?? 'Please try again.'}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </Screen>
    );
  }

  const tintKeys = Object.keys(tints) as TintKey[];
  const tint = tints[tintKeys[hashString(listing.id) % tintKeys.length]] ?? tints.indigo;
  const isSaved = favorites.data?.has(listing.id) ?? false;
  const open = isOpenNow(listing);
  const hasHours = Boolean(listing.opens_at && listing.closes_at);

  const mapsQuery = sanitizeSearchQuery(
    [listing.name, listing.address, listing.area, listing.city].filter(Boolean).join(' '),
  );
  const directionsUrl =
    listing.latitude != null && listing.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  const onCall = () => {
    const phone = listing.phone?.replace(/[^\d+]/g, '');
    if (!phone) return;
    void Linking.openURL(Platform.OS === 'web' ? `tel:${phone}` : `tel:${phone}`).catch(() => {
      void alertDialog({ title: 'Could not open the dialer', message: listing.phone ?? '' });
    });
  };

  const onDirections = () => {
    void Linking.openURL(directionsUrl).catch(() => {
      void alertDialog({
        title: 'Could not open maps',
        message: 'Check your connection and try again.',
      });
    });
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${listing.name}${listing.area ? ` — ${listing.area}, ${listing.city}` : ''}`,
      });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const onSaveToggle = () => {
    if (!isSaved) {
      toggle.mutate({ listingId: listing.id, save: true });
      return;
    }
    confirmDialog({
      title: 'Remove from saved?',
      message: `${listing.name} will be removed from your saved places.`,
      confirmLabel: 'Remove',
    })
      .then((yes) => {
        if (yes) toggle.mutate({ listingId: listing.id, save: false });
      })
      .catch(() => undefined);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title={listing.category?.name ?? 'Listing'} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoRow}
        style={styles.photoScroller}
      >
        {(listing.image_urls.length > 0 ? listing.image_urls : listing.image_url ? [listing.image_url] : []).map(
          (url) => (
            <Image key={url} source={{ uri: url }} style={styles.photo} contentFit="cover" transition={150} />
          ),
        )}
        {listing.image_urls.length === 0 && !listing.image_url ? (
          <View
            style={[
              styles.photo,
              styles.photoFallback,
              { backgroundColor: tint.bg, borderColor: tint.border },
            ]}
          >
            <Ionicons name="storefront-outline" size={40} color={tint.fg} />
            <ThemedText type="default" style={{ color: tint.fg, fontWeight: '700' }}>
              {initialsFor(listing.name)}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.headRow}>
        <View style={styles.titleWrap}>
          <View style={styles.nameRow}>
            <ThemedText type="title" style={styles.title}>
              {listing.name}
            </ThemedText>
            {listing.verified ? (
              <View style={[styles.verifiedPill, { backgroundColor: `${colors.primary}1A` }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <ThemedText type="small" style={{ color: colors.primary, fontWeight: '700' }}>
                  Verified
                </ThemedText>
              </View>
            ) : null}
          </View>
          {[listing.area, listing.city].filter(Boolean).length > 0 ? (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {[listing.area, listing.city].filter(Boolean).join(', ')}
            </ThemedText>
          ) : null}
        </View>
        <Pressable
          onPress={onSaveToggle}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save'}
          hitSlop={8}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={isSaved ? colors.primary : colors.textSecondary}
          />
        </Pressable>
      </View>

      {listing.has_student_discount && (listing.offers ?? []).length > 0 ? (
        <View style={[styles.offerCard, { borderColor: colors.success }]}>
          <Ionicons name="pricetag" size={16} color={colors.success} />
          <View style={{ flex: 1, gap: 4 }}>
            {(listing.offers ?? []).map((offer) => (
              <View key={offer.id}>
                <ThemedText type="default" style={{ fontWeight: '700', color: colors.success }}>
                  {offer.discount_kind === 'percent'
                    ? `${offer.discount_value}% off`
                    : offer.discount_kind === 'amount' && offer.discount_value != null
                      ? `BDT ${(offer.discount_value / 100).toLocaleString('en-IN')} off`
                      : offer.title}
                  {offer.applies_to ? ` — ${offer.applies_to}` : ''}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {offer.student_id_required ? 'Valid with student ID' : 'No student ID needed'}
                  {offer.valid_until ? ` · Valid until ${formatDateShort(offer.valid_until)}` : ''}
                  {offer.terms ? ` · ${offer.terms}` : ''}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {listing.summary ? (
        <ThemedText type="default" style={styles.section}>
          {listing.summary}
        </ThemedText>
      ) : null}
      {listing.description ? (
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {listing.description}
        </ThemedText>
      ) : null}

      {listing.services.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel icon="list-outline" label="Services" />
          <View style={styles.pillWrap}>
            {listing.services.map((s) => (
              <View key={s} style={[styles.pill, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {s}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionLabel icon="information-circle-outline" label="Details" />
        <View style={{ gap: 6 }}>
          {listing.address ? <Detail label="Address" value={listing.address} /> : null}
          {listing.opening_hours ? <Detail label="Hours" value={listing.opening_hours} /> : null}
          {hasHours ? (
            <Detail label="Open now" value={open ? 'Yes' : 'No'} valueColor={open ? colors.success : colors.danger} />
          ) : null}
          {listing.price_note ? (
            <Detail
              label="Pricing"
              value={`${listing.price_type ? HUB_PRICE_TYPE_LABELS[listing.price_type] + ' · ' : ''}${listing.price_note}`}
            />
          ) : null}
          {listing.phone ? <Detail label="Phone" value={listing.phone} /> : null}
          {listing.whatsapp ? <Detail label="WhatsApp" value={listing.whatsapp} /> : null}
          {listing.email ? <Detail label="Email" value={listing.email} /> : null}
          {listing.last_verified_at ? (
            <Detail label="Last verified" value={formatDateShort(listing.last_verified_at)} />
          ) : null}
        </View>
      </View>

      <View style={styles.actionRow}>
        {listing.phone ? (
          <PrimaryButton label="Call" onPress={onCall} size="compact" />
        ) : null}
        <PrimaryButton label="Directions" onPress={onDirections} size="compact" />
        <PrimaryButton label="Share" variant="outline" onPress={onShare} size="compact" />
        <PrimaryButton
          label="Report"
          variant="outline"
          onPress={() => setReportVisible(true)}
          size="compact"
        />
      </View>

      {listing.latitude != null && listing.longitude != null ? (
        <Pressable
          onPress={onDirections}
          accessibilityRole="button"
          accessibilityLabel="Open in maps"
          style={[styles.mapTile, { borderColor: colors.border }]}
        >
          <Ionicons name="map-outline" size={20} color={colors.primary} />
          <ThemedText type="small" style={{ color: colors.primary, fontWeight: '600', flex: 1 }}>
            {listing.latitude.toFixed(4)}, {listing.longitude.toFixed(4)} — open in maps
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <HubReportSheet
        visible={reportVisible}
        targetType="student_hub_listing"
        targetId={listing.id}
        onClose={() => setReportVisible(false)}
      />
    </Screen>
  );
}

function SectionLabel({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const colors = useTheme();
  return (
    <View style={styles.sectionLabelRow}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <ThemedText type="smallBold">{label}</ThemedText>
    </View>
  );
}

function Detail({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const colors = useTheme();
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" style={{ color: colors.textMuted, width: 110 }}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={{ flex: 1, color: valueColor ?? colors.text, fontWeight: '500' }}>
        {value}
      </ThemedText>
    </View>
  );
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  photoRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  // flexGrow:0 — RNW ScrollViews default to flexGrow:1 and would balloon
  // this photo strip on short pages, pushing content down.
  photoScroller: {
    flexGrow: 0,
  },
  photo: {
    width: 200,
    height: 130,
    borderRadius: 14,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 6,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 20,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  offerCard: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: Spacing.two + 2,
    marginBottom: Spacing.two,
  },
  section: {
    marginTop: Spacing.two + 2,
    marginBottom: Spacing.one + 2,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.one + 2,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two + 2,
  },
  mapTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
});
