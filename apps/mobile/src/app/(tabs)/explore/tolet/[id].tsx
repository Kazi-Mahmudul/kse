import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookmarkButton } from '@/components/bookmark-button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ToletDetailHero } from '@/features/tolet/components/tolet-detail-hero';
import { useReportToletListing, useToletListing } from '@/features/tolet/queries';
import { useTheme } from '@/hooks/use-theme';
import { analytics } from '@/lib/analytics';
import { alertDialog, confirmDialog } from '@/lib/confirm';
import {
  TOLET_GENDER_PREFERENCE_LABELS,
  TOLET_LISTING_STATUS_LABELS,
  TOLET_ROOM_TYPE_LABELS,
} from '@kse/shared';
import { REPORT_REASONS } from '@kse/validation';

/**
 * Bachelor To-Let listing detail (spec bachelor-to-let §Detail).
 *
 *   Hero gallery → header (title + status chips + verified) → contact
 *   buttons (call / WhatsApp / email) → details card → description → save.
 */
export default function ToletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const query = useToletListing(id ?? '');
  const report = useReportToletListing();

  if (query.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loading}>
          <Text style={{ color: colors.textSecondary }}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  if (query.error || !query.data) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon="alert-circle-outline"
          title="Listing unavailable"
          message="This listing could not be loaded — it may have been removed or is still under review."
          actionLabel="Back to To-Let"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const listing = query.data;

  // Fire the view event once we actually have data (effect-free; this is a
  // synchronous analytics call).
  if (listing?.id) {
    analytics.toletListingViewed(listing.id);
  }

  const location = [listing.area, listing.city].filter(Boolean).join(', ');
  const roomLabel = listing.room_type ? TOLET_ROOM_TYPE_LABELS[listing.room_type] : null;
  const genderLabel = listing.gender_preference
    ? TOLET_GENDER_PREFERENCE_LABELS[listing.gender_preference]
    : null;
  const statusLabel = TOLET_LISTING_STATUS_LABELS[listing.listing_status];

  const openTel = (phone: string) => {
    analytics.toletContactClicked(listing.id, 'phone');
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      alertDialog({ title: 'Call failed', message: 'Could not open the dialer.' });
    });
  };

  const openWhatsApp = (wa: string) => {
    analytics.toletContactClicked(listing.id, 'whatsapp');
    const digits = wa.replace(/[^\d+]/g, '').replace(/^\+/, '');
    Linking.openURL(`https://wa.me/${digits}`).catch(() => {
      alertDialog({ title: 'WhatsApp failed', message: 'Could not open WhatsApp.' });
    });
  };

  const openEmail = (email: string) => {
    analytics.toletContactClicked(listing.id, 'email');
    Linking.openURL(`mailto:${email}`).catch(() => {
      alertDialog({ title: 'Email failed', message: 'Could not open mail app.' });
    });
  };

  const handleReport = () => {
    const buttons = REPORT_REASONS.map((reason) => ({
      text: reason.charAt(0).toUpperCase() + reason.slice(1),
      onPress: async () => {
        try {
          await report.mutateAsync({ listingId: listing.id, reason });
          analytics.toletListingReported(listing.id, reason);
          alertDialog({ title: 'Reported', message: 'Thanks — staff will review.' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not send report';
          alertDialog({ title: 'Report failed', message });
        }
      },
    }));
    confirmDialog({
      title: 'Report this listing',
      message: 'Choose a reason — staff will review.',
      confirmLabel: REPORT_REASONS[0],
      cancelLabel: 'Cancel',
      buttons,
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.backRow}>
          <PrimaryButton
            label="Back"
            variant="outline"
            size="compact"
            onPress={() => router.back()}
          />
        </View>

        <ToletDetailHero imageUrls={listing.image_urls ?? []} title={listing.title} />

        <View style={styles.headerRow}>
          <View style={styles.headerBody}>
            <ThemedText type="title">{listing.title}</ThemedText>
            {location ? (
              <ThemedText type="small" themeColor="textSecondary">
                {location}
              </ThemedText>
            ) : null}
            <View style={styles.chipRow}>
              <View style={[styles.chip, { backgroundColor: statusBg(listing.listing_status, colors) }]}>
                <Text style={[styles.chipText, { color: statusFg(listing.listing_status, colors) }]}>
                  {statusLabel}
                </Text>
              </View>
              {roomLabel ? (
                <View style={[styles.chip, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                    {roomLabel}
                  </Text>
                </View>
              ) : null}
              {genderLabel ? (
                <View style={[styles.chip, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                    {genderLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <BookmarkButton id={listing.id} kind="tolet" variant="icon" />
        </View>

        <Card style={styles.contactCard}>
          <Text style={[styles.sectionTitle, { color: colors.heading ?? colors.text }]}>
            Contact
          </Text>
          <View style={styles.contactButtons}>
            <PrimaryButton
              label="Call"
              size="compact"
              onPress={() => listing.landlord_phone && openTel(listing.landlord_phone)}
              disabled={!listing.landlord_phone}
            />
            {listing.whatsapp ? (
              <PrimaryButton
                label="WhatsApp"
                variant="outline"
                size="compact"
                onPress={() => openWhatsApp(listing.whatsapp!)}
              />
            ) : null}
            {listing.contact_email ? (
              <PrimaryButton
                label="Email"
                variant="outline"
                size="compact"
                onPress={() => openEmail(listing.contact_email!)}
              />
            ) : null}
          </View>
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: colors.heading ?? colors.text }]}>
            Details
          </Text>
          <DetailRow
            icon="cash-outline"
            label="Rent"
            value={
              listing.rent_amount != null && listing.rent_currency
                ? `${listing.rent_currency} ${new Intl.NumberFormat('en-IN').format(listing.rent_amount)}/month`
                : null
            }
          />
          <DetailRow
            icon="business-outline"
            label="Total rooms"
            value={listing.total_rooms != null ? String(listing.total_rooms) : null}
          />
          <DetailRow
            icon="bed-outline"
            label="Available beds"
            value={listing.available_rooms != null ? String(listing.available_rooms) : null}
          />
          <DetailRow
            icon="layers-outline"
            label="Floor"
            value={listing.floor != null ? String(listing.floor) : null}
          />
          <DetailRow
            icon="school-outline"
            label="Bachelor friendly"
            value={listing.bachelor_friendly ? 'Yes' : 'No'}
          />
          <DetailRow
            icon="flash-outline"
            label="Utilities included"
            value={listing.utilities_included ? 'Yes' : 'No'}
          />
          <DetailRow
            icon="calendar-outline"
            label="Available from"
            value={listing.available_from}
          />
          <DetailRow icon="location-outline" label="Address" value={listing.location} />
        </Card>

        {listing.description ? (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.heading ?? colors.text }]}>
              About this listing
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>{listing.description}</Text>
          </Card>
        ) : null}

        <PrimaryButton
          label="Report this listing"
          variant="outline"
          onPress={handleReport}
        />

        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Always visit the room before paying any deposit.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null | undefined;
}) {
  const colors = useTheme();
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function statusBg(
  status: import('@kse/types').ToletListingStatus,
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
  status: import('@kse/types').ToletListingStatus,
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  backRow: {
    marginBottom: -Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerBody: {
    flex: 1,
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.one,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  contactCard: {
    gap: Spacing.two,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  detailsCard: {
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.one,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
