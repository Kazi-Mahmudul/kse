import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useMemo } from 'react';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealState, MealType } from '@kse/types';
import { StatusBadge } from './status-badge';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const MEAL_ICONS: Record<MealType, 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline'> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
};

interface MealToggleCardProps {
  mealType: MealType;
  state: MealState;
  /** e.g. "until 4:00 PM" / "closed at 4:00 PM" — empty hides the line. */
  cutoffLabel?: string;
  canToggle: boolean;
  disabled?: boolean;
  onToggle: (next: MealState) => void;
}

/**
 * Large interactive meal card (spec §4–§5). Tapping the whole card flips
 * the meal; the switch knob animates. When the cut-off has passed the card
 * is locked and says so in words, not just colour.
 */
export function MealToggleCard({
  mealType,
  state,
  cutoffLabel,
  canToggle,
  disabled,
  onToggle,
}: MealToggleCardProps) {
  const colors = useTheme();
  const isOn = state === 'on';
  // useMemo over useRef/useAnimatedValue: RN-web has no useAnimatedValue,
  // and reading a ref during render trips react-hooks/refs. Initial value is
  // captured once by design — the effect below animates subsequent changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const knob = useMemo(() => new Animated.Value(isOn ? 1 : 0), []);

  useEffect(() => {
    Animated.timing(knob, {
      toValue: isOn ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isOn, knob]);

  const locked = !canToggle;

  const handlePress = () => {
    if (disabled || locked) return;
    onToggle(isOn ? 'off' : 'on');
  };

  const accent = isOn ? colors.success : colors.textSecondary;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || locked}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn, disabled: locked || disabled }}
      accessibilityLabel={`${MEAL_LABELS[mealType]} ${isOn ? 'on' : 'off'}${locked ? ', change closed' : ''}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.background, borderColor: isOn ? `${colors.success}66` : colors.border },
        locked && styles.locked,
        pressed && !locked && styles.pressed,
      ]}
    >
      <Ionicons name={MEAL_ICONS[mealType]} size={22} color={accent} />
      <View style={styles.meta}>
        <ThemedText type="smallBold" themeColor={locked ? 'textSecondary' : 'heading'}>
          {MEAL_LABELS[mealType]}
        </ThemedText>
        {cutoffLabel ? (
          <ThemedText style={[styles.cutoff, { color: locked ? colors.warning : colors.textMuted }]}>
            {locked ? `Meal change closed · ${cutoffLabel.replace('closed at ', 'was until ')}` : `Change ${cutoffLabel}`}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.right}>
        <StatusBadge label={isOn ? 'ON' : 'OFF'} tone={isOn ? 'on' : 'off'} />
        <View
          style={[
            styles.track,
            { backgroundColor: isOn ? `${colors.success}33` : colors.backgroundElement },
            locked && styles.trackLocked,
          ]}
        >
          <Animated.View
            style={[
              styles.knob,
              {
                backgroundColor: accent,
                transform: [{ translateX: knob.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }) }],
              },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  locked: {
    opacity: 0.72,
  },
  pressed: {
    opacity: 0.8,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  cutoff: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
  },
  track: {
    width: 44,
    height: 26,
    borderRadius: 999,
    padding: 2,
  },
  trackLocked: {
    opacity: 0.5,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 999,
  },
});
