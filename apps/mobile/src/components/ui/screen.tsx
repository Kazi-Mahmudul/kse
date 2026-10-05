import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default) — disable for fixed layouts. */
  scroll?: boolean;
  /**
   * Edge-to-edge scaffold: skip the centred content column (no max-width,
   * no horizontal padding) so the screen can own its layout — e.g. the
   * mess area's full-width scroller with the readable column centred
   * inside it and a tab bar pinned across the whole screen. Vertical
   * padding still applies unless overridden via `style`.
   */
  fullBleed?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Pull-to-refresh, wired into the built-in ScrollView. */
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Standard screen chrome: safe areas, themed background, centered content
 * column with room for the bottom tab bar. Every tab screen starts with it.
 */
export function Screen({
  children,
  scroll = true,
  fullBleed = false,
  style,
  refreshing,
  onRefresh,
}: ScreenProps) {
  const colors = useTheme();

  const content = (
    <View style={[styles.content, !fullBleed && styles.column, scroll && styles.scrollContent, style]}>
      {children}
    </View>
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
            }
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
    // flex:1 so `scroll={false}` screens can host a bounded `flex:1`
    // ScrollView — without it the wrapper's height is content-based, the
    // inner ScrollView never gets a limit and the page clips unscrollably.
    flex: 1,
    width: '100%',
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  // The readable centred column — skipped for `fullBleed` screens.
  column: {
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  scrollContent: {
    flex: 1,
  },
});
