import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayMonth } from '../lib/dates';
import type { MessMemberDetail } from '@kse/types';
import { StatusBadge } from './status-badge';

/**
 * Member row (spec §16): avatar, name, role badge, joined date, and either
 * a trailing action button or a whole-row tap (manager action sheets).
 */
export function MemberRow({
  member,
  actionLabel,
  actionTone = 'neutral',
  onAction,
  onPress,
}: {
  member: MessMemberDetail;
  actionLabel?: string;
  actionTone?: 'neutral' | 'danger';
  onAction?: (member: MessMemberDetail) => void;
  onPress?: (member: MessMemberDetail) => void;
}) {
  const colors = useTheme();
  const isManager = member.role === 'manager';

  const body = (
    <>
      <ProfileAvatar name={member.user_name ?? '?'} url={member.user_avatar_url} size={44} />
      <View style={styles.meta}>
        <View style={styles.nameRow}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            {member.user_name ?? 'Unknown'}
          </ThemedText>
          {isManager ? <StatusBadge label="Manager" tone="manager" /> : null}
        </View>
        {member.joined_at ? (
          <ThemedText type="small" themeColor="textMuted">
            Joined {formatDayMonth(member.joined_at.slice(0, 10))}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textMuted">
            Request pending
          </ThemedText>
        )}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={() => onAction(member)}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} ${member.user_name ?? 'member'}`}
          style={({ pressed }) => [
            styles.action,
            actionTone === 'danger'
              ? { borderColor: colors.danger, backgroundColor: `${colors.danger}14` }
              : { borderColor: colors.primary, backgroundColor: `${colors.primary}14` },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText
            style={[
              styles.actionLabel,
              { color: actionTone === 'danger' ? colors.danger : colors.primary },
            ]}
          >
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => onPress(member)}
        accessibilityRole="button"
        accessibilityLabel={`${member.user_name ?? 'Member'}, ${isManager ? 'manager' : 'member'}. Tap for actions.`}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.background, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.row, { backgroundColor: colors.background, borderColor: colors.border }]}
      accessibilityLabel={`${member.user_name ?? 'Member'}, ${isManager ? 'manager' : 'member'}`}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  action: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.65,
  },
});
