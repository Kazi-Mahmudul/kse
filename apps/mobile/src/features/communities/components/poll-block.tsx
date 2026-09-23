import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useVotePoll } from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityPoll } from '@kse/types';

/** "in 2d 5h" style countdown for open polls. */
function formatTimeRemaining(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'soon';
  const hours = ms / 3_600_000;
  if (hours < 1) return `in ${Math.max(1, Math.round(ms / 60_000))}m`;
  if (hours < 24) return `in ${Math.round(hours)}h`;
  return `in ${Math.round(hours / 24)}d`;
}

/**
 * Inline poll for poll posts (spec §Polls): tap-to-vote options while open,
 * percentage bars once the viewer may see results. Result visibility is
 * enforced server-side — hidden votes come back as null counts.
 */
export function PollBlock({ poll, postId }: { poll: CommunityPoll; postId: string }) {
  const colors = useTheme();
  const vote = useVotePoll();

  const hasVoted = Boolean(poll.viewerVotedOptionId);
  const showResults = poll.options.some((o) => o.voteCount != null);
  const total = poll.totalVotes ?? 0;

  return (
    <View style={styles.block}>
      {poll.options.map((option) => {
        const mine = poll.viewerVotedOptionId === option.id;
        const count = option.voteCount;
        const pct = count != null && total > 0 ? Math.round((count / total) * 100) : null;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            disabled={poll.closed || hasVoted || vote.isPending}
            onPress={() => {
              if (poll.closed || hasVoted) return;
              vote.mutate({ pollId: poll.id, optionId: option.id, postId });
            }}
            style={({ pressed }) => [
              styles.option,
              {
                borderColor: mine ? colors.primary : colors.border,
                backgroundColor: mine ? `${colors.primary}14` : colors.background,
              },
              pressed && styles.pressed,
            ]}
          >
            {pct != null && (
              <View
                style={[
                  styles.bar,
                  { width: `${pct}%`, backgroundColor: `${colors.primary}22` },
                ]}
              />
            )}
            <View style={styles.optionRow}>
              <ThemedText
                type={mine ? 'smallBold' : 'small'}
                style={styles.optionText}
                themeColor={mine ? 'primary' : undefined}
              >
                {option.text}
              </ThemedText>
              {pct != null && (
                <ThemedText type="small" themeColor="textSecondary">
                  {pct}%
                </ThemedText>
              )}
              {mine && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
            </View>
          </Pressable>
        );
      })}

      <ThemedText type="small" themeColor="textMuted" style={styles.meta}>
        {poll.closed
          ? 'Poll closed'
          : poll.closesAt
            ? `Closes ${formatTimeRemaining(poll.closesAt)}`
            : 'Open poll'}
        {poll.totalVotes != null ? ` · ${poll.totalVotes} vote${poll.totalVotes === 1 ? '' : 's'}` : ''}
        {!showResults && !poll.closed && !hasVoted ? ' · results hidden until voted' : ''}
      </ThemedText>
      {vote.isError && (
        <ThemedText type="small" themeColor="danger">
          {(vote.error as Error).message}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.one + 2,
  },
  option: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  optionText: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  meta: {
    fontSize: 11,
  },
});
