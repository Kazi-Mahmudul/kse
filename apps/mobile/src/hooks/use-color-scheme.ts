import { useColorScheme as useRNColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settings-store';

/**
 * Effective color scheme: prefers the user's manual choice from
 * `useSettingsStore.themePreference`; when that is `'system'`, falls back
 * to the OS preference via RN's `useColorScheme`. Returns `'light' | 'dark'
 * | 'unspecified'` — `useTheme()` already maps `'unspecified'` to `'light'`.
 *
 * Subscription: `useSettingsStore` is a normal Zustand selector, so every
 * preference flip re-renders every consumer — which is what we want, since
 * `Colors[scheme]` is read on every render anyway.
 */
export function useColorScheme(): 'light' | 'dark' | 'unspecified' {
  const pref = useSettingsStore((s) => s.themePreference);
  const system = useRNColorScheme();
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return system;
}
