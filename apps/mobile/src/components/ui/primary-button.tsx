import { ActivityIndicator } from 'react-native';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ButtonSize = 'regular' | 'compact';

interface PrimaryButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'outline';
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
}

/**
 * Brand CTA. Two sizes:
 * - `regular` (default): full-width Save/Submit, 46 px tall, 15 px label.
 * - `compact`: inline pairings (Add beside Interests), 36 px tall, 13 px label.
 *
 * The disabled state is `disabled || loading`. No focus ring on tap — the
 * pressed opacity is the only state affordance, matching iOS HIG.
 */
export function PrimaryButton({
  label,
  loading = false,
  variant = 'primary',
  size = 'regular',
  disabled,
  style,
  ...pressableProps
}: PrimaryButtonProps) {
  const colors = useTheme();
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';
  const isCompact = size === 'compact';

  return (
    <Pressable
      {...pressableProps}
      disabled={isDisabled}
      style={({ pressed }) => [
        isCompact ? styles.compact : styles.regular,
        isOutline
          ? { borderColor: colors.primary, borderWidth: 1.5 }
          : { backgroundColor: colors.primary },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isOutline ? colors.primary : colors.onPrimary}
        />
      ) : (
        <Text
          style={[
            isCompact ? styles.labelCompact : styles.labelRegular,
            { color: isOutline ? colors.primary : colors.onPrimary },
            isDisabled && { opacity: 0.7 },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  regular: {
    borderRadius: 12,
    paddingVertical: 12,
    // Horizontal padding only matters when `regular` sits inline in a row
    // (community hero Join); full-width usage centers via alignItems anyway.
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  compact: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  labelRegular: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 13,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
});
