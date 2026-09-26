import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useSavedOpportunityIds, useToggleSavedOpportunity } from '@/features/saved/queries';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/hooks/use-theme';

interface BookmarkButtonProps {
  /** Opportunity or Bachelor To-Let id. Both share `saved_opportunities`. */
  id: string;
  /**
   * Source surface — used for analytics so the Save funnel can be split by
   * content type. Both surfaces share the same saved-state cache, so the
   * behaviour is otherwise identical.
   */
  kind?: 'opportunity' | 'tolet';
  /** Legacy single-purpose prop. Prefer `id` + `kind`. */
  opportunityId?: string;
  /** "icon" — compact Pressable for list cards; "button" — outline row for detail. */
  variant?: 'icon' | 'button';
}

/**
 * Bookmark / favorite toggle (step 10). State lives in the shared ids Set, so
 * every card and the detail screen stay in sync through one cache entry.
 *
 * Reused for Bachelor To-Let listings — the `saved_opportunities` table covers
 * both via the `opportunity_id` FK. Only the analytics event name differs.
 */
export function BookmarkButton({
  id,
  kind = 'opportunity',
  opportunityId,
  variant = 'icon',
}: BookmarkButtonProps) {
  const colors = useTheme();
  const idsQuery = useSavedOpportunityIds();
  const toggle = useToggleSavedOpportunity();

  const effectiveId = id ?? opportunityId ?? '';
  const saved = effectiveId ? idsQuery.data?.has(effectiveId) ?? false : false;
  const label = saved ? 'Saved' : 'Save for later';
  const icon = saved ? 'bookmark' : 'bookmark-outline';
  const tint = saved ? colors.primary : colors.textSecondary;

  const onPress = () => {
    if (!effectiveId) return;
    const next = !saved;
    toggle.mutate({ opportunityId: effectiveId, saved: next });
    if (kind === 'tolet') {
      analytics.toletListingFavorited?.(effectiveId, next);
    } else {
      analytics.opportunitySaved(effectiveId, next);
    }
  };

  if (variant === 'button') {
    return (
      <Pressable
        onPress={onPress}
        disabled={toggle.isPending}
        style={({ pressed }) => [
          styles.button,
          { borderColor: colors.primary, backgroundColor: saved ? `${colors.primary}1A` : 'transparent' },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={[styles.buttonLabel, { color: colors.primary }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.iconWrap}>
      <Pressable
        onPress={onPress}
        disabled={toggle.isPending}
        hitSlop={8}
        style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name={icon} size={20} color={tint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    minHeight: 46,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconWrap: {
    alignItems: 'flex-end',
  },
  icon: {
    padding: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
});
