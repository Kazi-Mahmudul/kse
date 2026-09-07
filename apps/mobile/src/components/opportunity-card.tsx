import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BookmarkButton } from '@/components/bookmark-button';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing, ThemeColor } from '@/constants/theme';
import { findCategory } from '@/features/explore/categories';
import { deadlineLabel, deadlineTone } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';
import type { IconName } from '@/types/icon';
import { OPPORTUNITY_MODE_LABELS, OPPORTUNITY_TYPE_LABELS } from '@kse/shared';
import type { OpportunitySummary } from '@kse/types';

const FALLBACK_ICONS: Record<string, IconName> = {
  internship: 'briefcase-outline',
  scholarship: 'school-outline',
  event: 'calendar-outline',
  workshop: 'construct-outline',
  mentorship: 'people-circle-outline',
};

interface OpportunityCardProps {
  opportunity: OpportunitySummary;
  /** Show the type label (mixed lists like Home > Latest). */
  showType?: boolean;
}

/** Compact opportunity row: icon/image, title/org, location, deadline chip. */
export function OpportunityCard({ opportunity, showType = false }: OpportunityCardProps) {
  const colors = useTheme();
  const category = findCategory(opportunity.type);
  const tint = colors[(category?.tint ?? 'primary') as ThemeColor];
  const icon = FALLBACK_ICONS[opportunity.type] ?? 'sparkles-outline';
  const tone = deadlineTone(opportunity.deadline);
  const expired = tone === 'danger';

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/[type]/[id]',
      params: { type: opportunity.type, id: opportunity.id },
    });

  return (
    <Card onPress={open} style={styles.card}>
      <View style={styles.row}>
        {opportunity.image_url ? (
          <Image
            source={{ uri: opportunity.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: `${tint}1A` }]}>
            <Ionicons name={icon} size={20} color={tint} />
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            {opportunity.verified && (
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={colors.success}
                accessibilityLabel="Verified"
              />
            )}
            {opportunity.featured && (
              <Ionicons
                name="star"
                size={13}
                color={colors.warning}
                accessibilityLabel="Featured"
              />
            )}
            <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
              {opportunity.title}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {opportunity.organization_name}
          </ThemedText>
          <View style={styles.metaRow}>
            {showType && (
              <Badge label={OPPORTUNITY_TYPE_LABELS[opportunity.type]} tone="primary" />
            )}
            {opportunity.opportunity_mode && (
              <Badge
                label={OPPORTUNITY_MODE_LABELS[opportunity.opportunity_mode]}
                tone="neutral"
              />
            )}
            {opportunity.location && (
              <View style={styles.location}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color={colors.textSecondary}
                />
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {opportunity.location}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.side}>
          <Badge
            label={deadlineLabel(opportunity.deadline)}
            tone={expired ? 'danger' : tone === 'warning' ? 'warning' : 'neutral'}
          />
          <BookmarkButton opportunityId={opportunity.id} />
        </View>
      </View>
      {opportunity.summary && (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {opportunity.summary}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: 2,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
  },
  side: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
});
