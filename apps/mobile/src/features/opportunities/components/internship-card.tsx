import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BookmarkButton } from '@/components/bookmark-button';
import { Spacing, type TintKey } from '@/constants/theme';
import { hashString, initialsFor } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { OpportunitySummary } from '@kse/types';

interface InternshipCardProps {
  opportunity: OpportunitySummary;
}

/**
 * Internship-hub card (spec 06._internship_hub_kse).
 *
 * Single-column full-width card with a 44px logo badge on the left and the
 * title / org / location / stipend / deadline stack on the right. The
 * bookmark sits at the right-hand edge of the body row.
 *
 * The card-press area and the bookmark-press area are DOM *siblings* — not
 * nested — so RNW can render each as its own `<button>` without triggering
 * the React DOM nesting validator (`<button>` cannot contain a `<button>`).
 * The outer View carries the card chrome (radius / border / shadow); the
 * inner Pressable wraps only the body so the bookmark sits next to it.
 */
export function InternshipCard({ opportunity }: InternshipCardProps) {
  const colors = useTheme();
  const tints = useTints();
  const tintKeys = Object.keys(tints) as TintKey[];
  const tintKey = tintKeys[hashString(opportunity.organization_name) % tintKeys.length] ?? 'indigo';
  const tint = tints[tintKey];

  const stipendLine = renderStipendLine(opportunity.stipend_amount, opportunity.stipend_currency);
  const deadlineLine = renderDeadlineLine(opportunity.deadline);

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/[type]/[id]',
      params: { type: 'internship', id: opportunity.id },
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
            <View style={[styles.logo, { backgroundColor: tint.bg, borderColor: tint.border }]}>
              <Text style={[styles.logoText, { color: tint.fg }]}>
                {initialsFor(opportunity.organization_name)}
              </Text>
            </View>
          )}

          <View style={styles.bodyText}>
            <Text style={[styles.title, { color: colors.heading ?? colors.text }]} numberOfLines={1}>
              {opportunity.title}
            </Text>
            <Text style={[styles.org, { color: colors.bodyStrong ?? colors.text }]} numberOfLines={1}>
              {opportunity.organization_name}
            </Text>
            {opportunity.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
                <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {opportunity.location}
                </Text>
              </View>
            ) : null}
            {stipendLine ? (
              <Text style={[styles.stipend, { color: colors.text }]}>
                {stipendLine.amount}
                <Text style={[styles.stipendSuffix, { color: colors.textMuted ?? colors.textSecondary }]}>
                  {` /${stipendLine.suffix}`}
                </Text>
              </Text>
            ) : null}
            {deadlineLine ? (
              <Text style={[styles.deadline, { color: colors.textSecondary }]}>
                <Text style={[styles.deadlineLabel, { color: colors.textSecondary }]}>
                  Apply Before:{' '}
                </Text>
                <Text style={[styles.deadlineDate, { color: colors.text }]}>
                  {deadlineLine}
                </Text>
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.bookmark}>
          <BookmarkButton opportunityId={opportunity.id} variant="icon" />
        </View>
      </View>
    </View>
  );
}

function renderStipendLine(
  amount: number | null,
  currency: string | null,
): { amount: string; suffix: string } | null {
  if (amount === null || amount === null) return null;
  if (!currency) return null;
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount);
  // Bangladesh uses the ৳ glyph; everything else shows the ISO code (e.g. "USD 500").
  const prefix = currency === 'BDT' ? '৳' : `${currency} `;
  return { amount: `${prefix}${formatted}`, suffix: 'month' };
}

function renderDeadlineLine(deadline: string | null): string | null {
  if (!deadline) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(deadline));
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
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoText: {
    fontSize: 14,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  meta: {
    fontSize: 10,
  },
  stipend: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  stipendSuffix: {
    fontWeight: '400',
  },
  deadline: {
    fontSize: 10,
    marginTop: 2,
  },
  deadlineLabel: {
    fontWeight: '400',
  },
  deadlineDate: {
    fontWeight: '600',
  },
  bookmark: {
    alignSelf: 'flex-start',
    marginTop: -2,
  },
});
