import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default) — disable for fixed layouts. */
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard screen chrome: safe areas, themed background, centered content
 * column with room for the bottom tab bar. Every tab screen starts with it.
 */
export function Screen({ children, scroll = true, style }: ScreenProps) {
  const colors = useTheme();

  const content = (
    <View style={[styles.content, scroll && styles.scrollContent, style]}>{children}</View>
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  scrollContent: {
    flex: 1,
  },
});
