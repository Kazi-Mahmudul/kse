import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { QUICK_ACCESS } from '@/features/home/items';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

/**
 * How many tiles show in the collapsed state. Mirrors the bKash "See more"
 * pattern (collapsed = first row of 4, expanded = all 8 tiles).
 */
const COLLAPSED_VISIBLE = 4;

/**
 * Home "Quick Access" grid (design 03._home_kse): a 4-column wrap of pastel
 * 48×48 tiles, each routing into an Explore section. The first row is
 * always visible; remaining tiles reveal when the user taps "See more" —
 * mirroring the bKash home screen's expandable services grid (English copy).
 */
export function QuickAccess() {
  const tints = useTints();
  const mutedText = useTheme().textMuted;
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? QUICK_ACCESS : QUICK_ACCESS.slice(0, COLLAPSED_VISIBLE);
  const hiddenCount = QUICK_ACCESS.length - COLLAPSED_VISIBLE;
  const canExpand = QUICK_ACCESS.length > COLLAPSED_VISIBLE;

  return (
    <View>
      <View style={styles.grid}>
        {visible.map((item) => {
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

      {canExpand ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'See less' : `See ${hiddenCount} more`}
          style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        >
          <ThemedText style={[styles.toggleLabel, { color: mutedText }]}>
            {expanded ? 'See less' : 'See more'}
          </ThemedText>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={mutedText}
          />
        </Pressable>
      ) : null}
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
  toggle: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  togglePressed: {
    opacity: 0.6,
  },
  toggleLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
});
