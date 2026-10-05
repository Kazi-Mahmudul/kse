import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { MessTabBar, type MessTab } from './mess-tab-bar';

interface MessScreenProps {
  messId: string;
  active: MessTab;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Scaffold for the four main mess sections (Home / Meals / Bazar / Finance):
 * scrollable body with the in-context MessTabBar pinned to the bottom,
 * above the safe area. Sub-screens (forms, members…) use plain `Screen`.
 *
 * Layout contract: the scaffold goes edge-to-edge (it neutralises `Screen`'s
 * centered column), the ScrollView spans the full screen width — so its
 * scrollbar sits at the window edge instead of floating beside a narrow
 * column on wide screens — and the readable content is a centred column
 * capped at `MaxContentWidth`. The tab bar stretches the full width too.
 */
export function MessScreen({ messId, active, children, refreshing, onRefresh }: MessScreenProps) {
  return (
    <Screen scroll={false} fullBleed style={{ paddingVertical: 0, gap: 0 }}>
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
        }
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
      <MessTabBar messId={messId} active={active} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: '100%',
    // Center the capped column on wide screens (web / tablet / landscape).
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
});
