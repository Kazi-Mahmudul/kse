import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { QUICK_ACCESS } from '@/features/home/items';
import { useTints } from '@/hooks/use-tints';

/**
 * Home "Quick Access" grid (design 03._home_kse): two rows of four pastel
 * 48×48 tiles, each routing into an Explore section.
 */
export function QuickAccess() {
  const tints = useTints();

  return (
    <View style={styles.grid}>
      {QUICK_ACCESS.map((item) => {
        const tint = tints[item.tint];
        return (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.href)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.tile,
                { backgroundColor: tint.bg, borderColor: tint.border },
              ]}
            >
              <Ionicons name={item.icon} size={20} color={tint.fg} />
            </View>
            <ThemedText themeColor="bodyStrong" style={styles.label} numberOfLines={1}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  cell: {
    width: '25%',
    alignItems: 'center',
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamilies.medium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 6,
  },
  pressed: {
    opacity: 0.6,
  },
});
