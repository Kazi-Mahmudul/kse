import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settings-store';

const emptySubscribe = () => () => {};

/**
 * Web entry point: same logic as the native hook but with the existing
 * `useSyncExternalStore` hydration gate so the first SSR paint matches the
 * resolved scheme and never flashes a wrong-theme frame.
 */
export function useColorScheme(): 'light' | 'dark' | 'unspecified' {
  const hasHydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const pref = useSettingsStore((s) => s.themePreference);
  const system = useRNColorScheme();

  // Before hydration, treat the preference as the OS value to avoid a
  // white-to-dark flash on first paint. Once hydrated, honour the user
  // choice (which itself may be 'system' and falls through to `system`).
  if (!hasHydrated) return system;

  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return system;
}
