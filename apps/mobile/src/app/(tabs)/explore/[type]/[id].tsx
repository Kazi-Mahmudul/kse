import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
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
import { daysUntil, deadlineLabel, deadlineTone, formatDate } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';
import {
  OPPORTUNITY_MODE_LABELS,
  OPPORTUNITY_TYPE_LABELS,
} from '@kse/shared';

/** Opportunity detail (step 8): full listing + apply via the official URL. */
export default function OpportunityDetailScreen() {
  const colors = useTheme();
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const query = useOpportunity(id);
  const category = type ? findCategory(type) : undefined;

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
              {expired ? 'Deadline passed' : 'Application deadline'}
            </ThemedText>
            <ThemedText type="smallBold">{formatDate(opportunity.deadline)}</ThemedText>
          </View>
          <Badge
            label={deadlineLabel(opportunity.deadline)}
            tone={expired ? 'danger' : days !== null && days <= 7 ? 'warning' : 'neutral'}
          />
        </View>
      </Card>

      {(opportunity.location || opportunity.tags.length > 0) && (
        <>
          <SectionHeader title="Details" />
          <Card>
            {opportunity.location && (
              <DetailRow icon="location-outline" label="Location" value={opportunity.location} />
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

      {opportunity.application_url ? (
        <PrimaryButton
          label={expired ? 'Deadline passed' : 'Apply now'}
          disabled={expired}
          onPress={() => void openUrl(opportunity.application_url!)}
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
  icon: 'location-outline' | 'link-outline';
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
