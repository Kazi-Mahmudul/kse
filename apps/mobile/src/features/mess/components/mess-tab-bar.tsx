import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MessTab = 'home' | 'meals' | 'bazar' | 'finance' | 'more';

const TABS: { key: MessTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'meals', label: 'Meals', icon: 'restaurant-outline' },
  { key: 'bazar', label: 'Bazar', icon: 'cart-outline' },
  { key: 'finance', label: 'Finance', icon: 'wallet-outline' },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal' },
];

const ROUTE: Record<MessTab, string> = {
  home: '/mess/[id]',
  meals: '/mess/[id]/meals',
  bazar: '/mess/[id]/bazar',
  finance: '/mess/[id]/finance',
  more: '/mess/[id]/more',
};

/**
 * In-context section bar for the mess area (spec §19): Home / Meals / Bazar /
 * Finance / More. The mess screens live in a stack above the app's global
 * tabs, so this is a lightweight footer on the four main screens rather than
 * a second OS-level tab navigator.
 */
export function MessTabBar({ messId, active }: { messId: string; active: MessTab }) {
  const colors = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const fg = isActive ? colors.primary : colors.textMuted;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (isActive) return;
              router.push({
                pathname: ROUTE[tab.key],
                params: { id: messId },
              } as never);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons name={tab.icon} size={22} color={fg} />
            <ThemedText style={[styles.label, { color: fg }]}>{tab.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
});
