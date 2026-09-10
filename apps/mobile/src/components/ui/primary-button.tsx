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
 * - `regular` (default): full-width Save/Submit, 52 px tall, 17 px label.
 * - `compact`: inline pairings (Add beside Interests), 44 px tall, 14 px label.
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
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  compact: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  labelRegular: {
    fontSize: 17,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
});
