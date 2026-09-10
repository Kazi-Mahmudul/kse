import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * User's manual theme preference.
 *
 * `'system'` (the default) means the app follows the OS via RN's
 * `useColorScheme()` — flipping the device theme flips the app. The other
 * two values lock the app to that scheme regardless of OS. Persisted on the
 * device via AsyncStorage so the choice survives a relaunch.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

/**
 * Device-local settings (CLAUDE.md rule 12: keep client state out of the
 * server). Persisted via AsyncStorage — key `kse.settings`. No server sync
 * in MVP (a future step could sync `themePreference` to a `profiles` column).
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (pref) => set({ themePreference: pref }),
    }),
    {
      name: 'kse.settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Bump this when the shape changes so old persisted payloads don't
      // silently overwrite new defaults.
      version: 1,
    },
  ),
);
