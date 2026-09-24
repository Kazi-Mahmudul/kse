import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing, type TintKey } from '@/constants/theme';
import { SCHOLARSHIP_MATCH_LEVEL_LABELS } from '@kse/shared';
import type { ScholarshipMatch, ScholarshipMatchReason } from '@kse/types';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

interface MatchPanelProps {
  match: ScholarshipMatch | null;
  loading: boolean;
}

/**
 * "Your match" panel shown on the scholarship detail page. Lists each
 * rule the engine ran with its pass/fail verdict and human-readable
 * explanation. Renders nothing while the matcher is still resolving so
 * the detail page doesn't flicker an empty panel.
 */
export function MatchPanel({ match, loading }: MatchPanelProps) {
  const colors = useTheme();
  const tints = useTints();

  const tintKey = useMemo<TintKey | null>(() => {
    if (!match) return null;
    switch (match.level) {
      case 'highly_matched':
        return 'emerald';
      case 'eligible':
        return 'indigo';
      case 'potential':
        return 'amber';
      case 'not_eligible':
        return 'slate';
    }
  }, [match]);

  if (loading) return null;
  if (!match) return null;

  const tint = tintKey ? tints[tintKey] : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        <ThemedText type="smallBold">Your match</ThemedText>
      </View>

      <Card
        tint="backgroundElement"
        style={[
          styles.summary,
          tint ? { borderColor: tint.border, backgroundColor: tint.bg } : null,
        ]}
      >
        <Text style={[styles.summaryLabel, { color: tint?.fg ?? colors.text }]}>
          {SCHOLARSHIP_MATCH_LEVEL_LABELS[match.level]}
        </Text>
        <Text style={[styles.summaryHelper, { color: colors.textSecondary }]}>
          {summaryHelper(match.level)}
        </Text>
      </Card>

      {match.reasons.length > 0 ? (
        <View style={styles.reasonList}>
          {match.reasons.map((reason) => (
            <ReasonRow key={reason.rule + reason.message} reason={reason} />
          ))}
        </View>
      ) : (
        <Text style={[styles.helper, { color: colors.textSecondary }]}>
          No specific eligibility rules are published for this scholarship.
          Apply if it looks interesting.
        </Text>
      )}
    </View>
  );
}

function summaryHelper(level: ScholarshipMatch['level']): string {
  switch (level) {
    case 'highly_matched':
      return 'Your profile satisfies every published requirement — a strong candidate.';
    case 'eligible':
      return 'You satisfy every published requirement — go for it.';
    case 'potential':
      return 'You are close. Review the missing items below — adding them could unlock this.';
    case 'not_eligible':
      return 'One or more published requirements are not met by your current profile.';
  }
}

function ReasonRow({ reason }: { reason: ScholarshipMatchReason }) {
  const colors = useTheme();
  const passed = reason.passed;
  return (
    <View style={styles.reasonRow}>
      <Ionicons
        name={passed ? 'checkmark-circle' : 'close-circle'}
        size={18}
        color={passed ? colors.success : colors.danger}
      />
      <Text
        style={[
          styles.reasonText,
          { color: passed ? colors.text : colors.textSecondary },
        ]}
      >
        {reason.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  summary: {
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  summaryHelper: {
    fontSize: 12,
    marginTop: 4,
  },
  reasonList: {
    gap: Spacing.one + 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  helper: {
    fontSize: 12,
  },
});
