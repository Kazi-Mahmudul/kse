import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BookmarkButton } from '@/components/bookmark-button';
import { Spacing, type TintKey } from '@/constants/theme';
import { hashString, initialsFor } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import {
  DEGREE_LEVEL_LABELS,
  FUNDING_TYPE_LABELS,
  SCHOLARSHIP_MATCH_LEVEL_LABELS,
} from '@kse/shared';
import type {
  OpportunitySummary,
  ScholarshipMatchLevel,
} from '@kse/types';

interface ScholarshipCardProps {
  opportunity: OpportunitySummary;
  /**
   * Optional match verdict from the rule-based engine — when present,
   * a coloured chip surfaces the verdict (Highly Matched / Eligible /
   * Potential / Not Eligible). Omitted while the matching engine is
   * still loading.
   */
  matchLevel?: ScholarshipMatchLevel | null;
}

/**
 * Scholarship-hub card (spec 07._scholarship_hub_kse).
 *
 * Single-column full-width card with a 48px emblem badge on the left and the
 * title / org / degree-level chip / deadline stack on the right. The bookmark
 * sits at the right-hand edge of the body row.
 *
 * The card-press area and the bookmark-press area are DOM *siblings* — not
 * nested — so RNW can render each as its own `<button>` without triggering
 * the React DOM nesting validator (`<button>` cannot contain a `<button>`).
 * The outer View carries the card chrome (radius / border / shadow); the
 * inner Pressable wraps only the body so the bookmark sits next to it.
 */
export function ScholarshipCard({ opportunity, matchLevel }: ScholarshipCardProps) {
  const colors = useTheme();
  const tints = useTints();
  const tintKeys = Object.keys(tints) as TintKey[];
  const tintKey =
    tintKeys[hashString(opportunity.organization_name) % tintKeys.length] ??
    'indigo';
  const tint = tints[tintKey];

  const degreeLabel = opportunity.degree_level
    ? DEGREE_LEVEL_LABELS[opportunity.degree_level]
    : null;
  const fundingLabel = opportunity.funding_type
    ? FUNDING_TYPE_LABELS[opportunity.funding_type]
    : null;
  const deadlineLabel = formatDeadline(opportunity.deadline);
  const deadlineNote =
    !opportunity.deadline && opportunity.deadline_note
      ? opportunity.deadline_note
      : null;

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/[type]/[id]',
      params: { type: 'scholarship', id: opportunity.id },
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
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={open}
          android_ripple={{ color: colors.shadow }}
          accessibilityRole="button"
          accessibilityLabel={`${opportunity.title} at ${opportunity.organization_name}`}
          style={({ pressed }) => [
            styles.bodyPress,
            pressed && { opacity: 0.95 },
          ]}
        >
          {opportunity.image_url ? (
            <Image
              source={{ uri: opportunity.image_url }}
              style={styles.logo}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View
              style={[
                styles.logo,
                { backgroundColor: tint.bg, borderColor: tint.border },
              ]}
            >
              <Text style={[styles.logoText, { color: tint.fg }]}>
                {initialsFor(opportunity.organization_name)}
              </Text>
            </View>
          )}

          <View style={styles.bodyText}>
            <Text
              style={[styles.title, { color: colors.heading ?? colors.text }]}
              numberOfLines={2}
            >
              {opportunity.title}
            </Text>
            <Text
              style={[
                styles.org,
                { color: colors.bodyStrong ?? colors.text },
              ]}
              numberOfLines={1}
            >
              {opportunity.organization_name}
            </Text>
            {(degreeLabel || fundingLabel || matchLevel) && (
              <View style={styles.chipRow}>
                {matchLevel ? (
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: matchTone(matchLevel, tints).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: matchTone(matchLevel, tints).fg },
                      ]}
                    >
                      {SCHOLARSHIP_MATCH_LEVEL_LABELS[matchLevel]}
                    </Text>
                  </View>
                ) : null}
                {degreeLabel ? (
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: colors.backgroundElement },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {degreeLabel}
                    </Text>
                  </View>
                ) : null}
                {fundingLabel ? (
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: colors.backgroundElement },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {fundingLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
            {deadlineLabel || deadlineNote ? (
              <Text style={[styles.deadline, { color: colors.textMuted }]}>
                <Text style={{ color: colors.textMuted }}>Deadline: </Text>
                <Text
                  style={[
                    styles.deadlineDate,
                    { color: colors.bodyStrong ?? colors.text },
                  ]}
                >
                  {deadlineLabel ?? deadlineNote}
                </Text>
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.bookmark}>
          <BookmarkButton id={opportunity.id} variant="icon" />
        </View>
      </View>
    </View>
  );
}

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(deadline));
}

/** Coloured pair per match level — keeps the badge consistent across the
 *  Hub and the detail page without re-importing a generic Badge helper. */
function matchTone(level: ScholarshipMatchLevel, tints: Record<TintKey, { bg: string; fg: string }>) {
  switch (level) {
    case 'highly_matched':
      return tints.emerald;
    case 'eligible':
      return tints.indigo;
    case 'potential':
      return tints.amber;
    case 'not_eligible':
      return tints.slate;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    // Subtle elevation matching the rest of the app's card shadow.
    elevation: 1,
    overflow: 'hidden', // clip the android_ripple to the card radius
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  bodyPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bodyText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  org: {
    fontSize: 11,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  deadline: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  deadlineDate: {
    fontWeight: '600',
  },
  bookmark: {
    alignSelf: 'flex-start',
    marginTop: -2,
  },
});
