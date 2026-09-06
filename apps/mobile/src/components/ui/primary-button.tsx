import { ActivityIndicator } from 'react-native';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface PrimaryButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'outline';
}

export function PrimaryButton({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  ...pressableProps
}: PrimaryButtonProps) {
  const colors = useTheme();
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';

  return (
    <Pressable
      {...pressableProps}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isOutline
          ? { borderColor: colors.primary, borderWidth: 1.5 }
          : { backgroundColor: colors.primary },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isOutline ? colors.primary : colors.onPrimary} />
      ) : (
        <Text
          style={[
            styles.label,
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
  base: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
});
