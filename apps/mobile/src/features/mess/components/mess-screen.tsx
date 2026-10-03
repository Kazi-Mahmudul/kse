import type { ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
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
 */
export function MessScreen({ messId, active, children, refreshing, onRefresh }: MessScreenProps) {
  return (
    <Screen scroll={false} style={{ paddingBottom: 0, gap: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.four,
          paddingTop: Spacing.three,
          paddingBottom: Spacing.four,
          gap: Spacing.three,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
        }
      >
        {children}
      </ScrollView>
      <MessTabBar messId={messId} active={active} />
    </Screen>
  );
}
