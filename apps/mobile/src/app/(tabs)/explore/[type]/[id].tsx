import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { BookmarkButton } from '@/components/bookmark-button';
import { RegisterButton } from '@/components/register-button';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing, ThemeColor } from '@/constants/theme';
import { findCategory } from '@/features/explore/categories';
import { useOpportunity } from '@/features/opportunities/queries';
import { daysUntil, deadlineLabel, deadlineTone, formatDate, formatDateTime } from '@/lib/dates';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/hooks/use-theme';
import {
  DEGREE_LEVEL_LABELS,
  FUNDING_TYPE_LABELS,
  OPPORTUNITY_INTERNSHIP_TYPE_LABELS,
  OPPORTUNITY_MODE_LABELS,
  OPPORTUNITY_TYPE_LABELS,
} from '@kse/shared';

/** Opportunity detail (step 8): full listing + apply via the official URL. */
export default function OpportunityDetailScreen() {
  const colors = useTheme();
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const query = useOpportunity(id);
  const category = type ? findCategory(type) : undefined;

  // Track view (step 19 analytics). Fire once per successful fetch.
  const trackedId = query.data?.id;
  useEffect(() => {
    if (trackedId && query.data?.type) {
      analytics.opportunityViewed(trackedId, query.data.type);
    }
  }, [trackedId, query.data?.type]);

  if (query.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen scroll={false}>
        <BackHeader title={category?.label ?? 'Opportunity'} />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load this opportunity"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      </Screen>
    );
  }

  const opportunity = query.data;
  const tint = colors[(category?.tint ?? 'primary') as ThemeColor];
  const isEvent = opportunity.type === 'event' || opportunity.type === 'workshop';
  const expired = deadlineTone(opportunity.deadline) === 'danger';
  const days = daysUntil(opportunity.deadline);

  const openUrl = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <Screen>
      <BackHeader title={category?.label ?? 'Opportunity'} />

      {opportunity.image_url ? (
        <Image
          source={{ uri: opportunity.image_url }}
          style={styles.hero}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.heroFallback, { backgroundColor: `${tint}1A` }]}>
          <Ionicons
            name={category?.icon ?? 'sparkles-outline'}
            size={40}
            color={tint}
          />
        </View>
      )}

      <View style={styles.heading}>
        <View style={styles.badges}>
          <Badge label={OPPORTUNITY_TYPE_LABELS[opportunity.type]} tone="primary" />
          {opportunity.verified && <Badge label="Verified" tone="success" />}
          {opportunity.featured && <Badge label="Featured" tone="warning" />}
          {opportunity.opportunity_mode && (
            <Badge
              label={OPPORTUNITY_MODE_LABELS[opportunity.opportunity_mode]}
              tone="neutral"
            />
          )}
          {opportunity.type === 'internship' && opportunity.internship_type && (
            <Badge
              label={OPPORTUNITY_INTERNSHIP_TYPE_LABELS[opportunity.internship_type]}
              tone="neutral"
            />
          )}
        </View>
        <ThemedText type="subtitle">{opportunity.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {opportunity.organization_name}
        </ThemedText>
      </View>

      <Card tint={expired ? 'danger' : deadlineTone(opportunity.deadline) === 'warning' ? 'warning' : 'backgroundElement'}>
        <View style={styles.deadlineRow}>
          <Ionicons
            name="time-outline"
            size={20}
            color={expired ? colors.danger : colors.textSecondary}
          />
          <View style={styles.deadlineText}>
            <ThemedText type="small" themeColor="textSecondary">
              {expired
                ? isEvent
                  ? 'Registration closed'
                  : 'Deadline passed'
                : isEvent
                  ? 'Registration deadline'
                  : 'Application deadline'}
            </ThemedText>
            <ThemedText type="smallBold">{formatDate(opportunity.deadline)}</ThemedText>
          </View>
          <Badge
            label={deadlineLabel(opportunity.deadline)}
            tone={expired ? 'danger' : days !== null && days <= 7 ? 'warning' : 'neutral'}
          />
        </View>
      </Card>

      {(opportunity.location ||
        opportunity.country ||
        opportunity.degree_level ||
        opportunity.funding_type ||
        (isEvent && opportunity.starts_at) ||
        (opportunity.type === 'internship' &&
          (opportunity.stipend_amount !== null ||
            opportunity.internship_type !== null)) ||
        opportunity.tags.length > 0) && (
        <>
          <SectionHeader title="Details" />
          <Card>
            {isEvent && opportunity.starts_at && (
              <DetailRow
                icon="calendar-outline"
                label="Event date"
                value={formatDateTime(opportunity.starts_at) ?? formatDate(opportunity.starts_at)}
              />
            )}
            {opportunity.location && (
              <DetailRow icon="location-outline" label="Location" value={opportunity.location} />
            )}
            {opportunity.country && (
              <DetailRow icon="globe-outline" label="Country" value={opportunity.country} />
            )}
            {opportunity.degree_level && (
              <DetailRow
                icon="school-outline"
                label="Degree level"
                value={DEGREE_LEVEL_LABELS[opportunity.degree_level]}
              />
            )}
            {opportunity.funding_type && (
              <DetailRow
                icon="cash-outline"
                label="Funding"
                value={FUNDING_TYPE_LABELS[opportunity.funding_type]}
              />
            )}
            {opportunity.type === 'internship' &&
              opportunity.stipend_amount !== null &&
              opportunity.stipend_currency && (
                <DetailRow
                  icon="cash-outline"
                  label="Monthly stipend"
                  value={formatStipend(opportunity.stipend_amount, opportunity.stipend_currency)}
                />
              )}
            {opportunity.type === 'internship' && opportunity.internship_type && (
              <DetailRow
                icon="briefcase-outline"
                label="Internship type"
                value={OPPORTUNITY_INTERNSHIP_TYPE_LABELS[opportunity.internship_type]}
              />
            )}
            {opportunity.tags.length > 0 && (
              <View style={styles.tagRow}>
                {opportunity.tags.map((tag) => (
                  <Chip key={tag} label={tag} />
                ))}
              </View>
            )}
          </Card>
        </>
      )}

      {opportunity.eligibility && (
        <>
          <SectionHeader title="Eligibility" />
          <Card>
            <ThemedText type="small">{opportunity.eligibility}</ThemedText>
          </Card>
        </>
      )}

      {opportunity.description && (
        <>
          <SectionHeader title="About this opportunity" />
          <Card>
            <ThemedText type="small">{opportunity.description}</ThemedText>
          </Card>
        </>
      )}

      {opportunity.source_name && (
        <>
          <SectionHeader title="Source" />
          <Card
            onPress={opportunity.source_url ? () => void openUrl(opportunity.source_url!) : undefined}
          >
            <DetailRow
              icon="link-outline"
              label={opportunity.source_name}
              value={opportunity.source_url ?? 'Manually curated'}
            />
          </Card>
        </>
      )}

      <BookmarkButton opportunityId={opportunity.id} variant="button" />

      {isEvent && <RegisterButton opportunityId={opportunity.id} />}

      {isEvent ? null : opportunity.application_url ? (
        <PrimaryButton
          label={expired ? 'Deadline passed' : 'Apply now'}
          disabled={expired}
          onPress={() => {
            if (opportunity.application_url) {
              analytics.applyClicked(opportunity.id, opportunity.type);
              void openUrl(opportunity.application_url);
            }
          }}
        />
      ) : (
        <Card tint="warning">
          <ThemedText type="small">
            No application link yet — check the source or contact the organizer.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon:
    | 'location-outline'
    | 'link-outline'
    | 'globe-outline'
    | 'school-outline'
    | 'cash-outline'
    | 'briefcase-outline'
    | 'calendar-outline';
  label: string;
  value: string;
}) {
  const colors = useTheme();
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <View style={styles.detailText}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold" numberOfLines={2}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

/** "৳8,000 /month" / "USD 500 /month" — same prefix rules as the card. */
function formatStipend(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
  const prefix = currency === 'BDT' ? '৳' : `${currency} `;
  return `${prefix}${formatted} /month`;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: '100%',
    height: 170,
    borderRadius: Spacing.four,
  },
  heroFallback: {
    width: '100%',
    height: 120,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    gap: Spacing.one + 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  deadlineText: {
    flex: 1,
    gap: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  detailText: {
    flex: 1,
    gap: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
    marginTop: Spacing.two,
  },
});
