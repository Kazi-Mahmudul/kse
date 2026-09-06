import { Pressable, StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing, ThemeColor } from '@/constants/theme';

interface CardProps extends ViewProps {
  /** Background tint; defaults to the subtle element fill (docs/design/tokens.md). */
  tint?: Extract<ThemeColor, 'backgroundElement' | 'background' | 'primary' | 'success' | 'warning' | 'danger'>;
  onPress?: () => void;
}

/** Rounded surface card (radius 16, tokens "Shape"). Pressable when onPress is set. */
export function Card({ tint = 'backgroundElement', onPress, style, children, ...rest }: CardProps) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type={tint} style={[styles.card, style]} {...rest}>
          {children}
        </ThemedView>
      </Pressable>
    );
  }
  return (
    <ThemedView type={tint} style={[styles.card, style]} {...rest}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.85,
  },
});
