import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayMonth } from '../lib/dates';
import { paisaToBdtCompact } from '@kse/types';
import type { BazarPurchaseDetail } from '@kse/types';

/** One bazar purchase row: buyer, date, amount, item preview (spec §7). */
export function BazarEntryCard({
  purchase,
  canDelete,
  onDelete,
  onPress,
}: {
  purchase: BazarPurchaseDetail;
  canDelete?: boolean;
  onDelete?: (purchase: BazarPurchaseDetail) => void;
  onPress?: (purchase: BazarPurchaseDetail) => void;
}) {
  const colors = useTheme();
  const items = purchase.items ?? [];

  return (
    <Pressable
      onPress={onPress ? () => onPress(purchase) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.background, borderColor: colors.border }, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}1A` }]}>
          <Ionicons name="basket-outline" size={16} color={colors.primary} />
        </View>
        <View style={styles.meta}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {purchase.buyer_name ?? 'Unknown'}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {formatDayMonth(purchase.purchase_date)} · {items.length} item{items.length === 1 ? '' : 's'}
          </ThemedText>
        </View>
        <View style={styles.right}>
          <ThemedText style={[styles.amount, { color: colors.success }]}>
            {paisaToBdtCompact(purchase.total_amount)}
          </ThemedText>
          {canDelete && onDelete ? (
            <Pressable
              onPress={() => onDelete(purchase)}
              accessibilityRole="button"
              accessibilityLabel={`Delete bazar entry from ${purchase.buyer_name ?? 'member'}`}
              hitSlop={8}
              style={({ pressed }) => [styles.trash, pressed && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {items.length > 0 ? (
        <View style={[styles.items, { borderTopColor: colors.border }]}>
          {items.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.itemName}>
                {item.item_name}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {item.quantity ? `${item.quantity} ${item.unit} · ` : ''}
                {paisaToBdtCompact(item.total_price ?? item.unit_price)}
              </ThemedText>
            </View>
          ))}
          {items.length > 3 ? (
            <ThemedText type="small" themeColor="textMuted">
              +{items.length - 3} more
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three - 6,
  },
  pressed: {
    opacity: 0.75,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  amount: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
  },
  items: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three - 6,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemName: {
    flexShrink: 1,
  },
  trash: {
    padding: 4,
  },
});
