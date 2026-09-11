import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IconName } from '@/types/icon';

/**
 * Structural subset of what expo-router's Tabs passes to a custom tabBar
 * (expo-router ships its own fork of bottom-tabs, so no public props type).
 */
interface TabsBarProps {
  state: {
    index: number;
    routes: readonly { name: string; key: string }[];
  };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target?: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

const ITEMS: {
  name: string;
  label: string;
  icon: IconName;
}[] = [
  { name: 'index', label: 'Home', icon: 'home-outline' },
  { name: 'explore', label: 'Explore', icon: 'search-outline' },
  { name: 'community', label: 'Community', icon: 'people-outline' },
  { name: 'profile', label: 'Profile', icon: 'person-outline' },
];

/**
 * Brand bottom bar (spec §32 / docs/design/tokens.md): Home, Explore,
 * elevated center "+", Community, Profile. The "+" opens the quick-action
 * modal instead of switching tabs.
 */
export function TabsBar({ state, navigation }: TabsBarProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const item = (it: (typeof ITEMS)[number]) => {
    const isFocused = state.routes[state.index]?.name === it.name;
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes.find((r) => r.name === it.name)?.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(it.name);
      }
    };

    return (
      <Pressable
        key={it.name}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={it.label}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        <Ionicons
          name={isFocused ? (it.icon.replace('-outline', '') as IconName) : it.icon}
          size={23}
          color={isFocused ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.label,
            { color: isFocused ? colors.primary : colors.textSecondary },
          ]}
        >
          {it.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
          paddingBottom: Math.max(insets.bottom, Spacing.one + 2),
        },
      ]}
    >
      <View style={styles.row}>
        {ITEMS.slice(0, 2).map(item)}
        <Pressable
          onPress={() => router.push('/create')}
          accessibilityRole="button"
          accessibilityLabel="Quick actions"
          style={({ pressed }) => [styles.fabWrap, pressed && styles.pressed]}
        >
          <View style={[styles.fab, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={30} color={colors.onPrimary} />
          </View>
        </Pressable>
        {ITEMS.slice(2).map(item)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: {
    opacity: 0.7,
  },
});
