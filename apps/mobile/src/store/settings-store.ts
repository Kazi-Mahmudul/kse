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
  /**
   * Set true after the user has seen the three onboarding screens (or hit
   * Skip). Persists across reinstalls via AsyncStorage. Read by the root
   * `AuthGate` to decide whether to push to `/onboarding/welcome` first.
   */
  hasCompletedOnboarding: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  setHasCompletedOnboarding: (value: boolean) => void;
}

/**
 * Device-local settings (CLAUDE.md rule 12: keep client state out of the
 * server). Persisted via AsyncStorage — key `kse.settings`. No server sync
 * in MVP (a future step could sync `themePreference` to a `profiles` column).
 *
 * `version: 2` was bumped when `hasCompletedOnboarding` was added. The
 * `migrate` callback defaults the new key on payloads persisted at v1 —
 * older installs land on the onboarding flow exactly once, then the flag
 * persists from there.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      hasCompletedOnboarding: false,
      setThemePreference: (pref) => set({ themePreference: pref }),
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
    }),
    {
      name: 'kse.settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, fromVersion) => {
        // v1 only had themePreference; the new key falls through to its
        // default (false), which means older installs land on onboarding
        // once. Intentional: every user who upgrades to v2 of the app
        // should see the new screens at least once.
        if (fromVersion < 2) {
          return {
            ...(persisted as object),
            hasCompletedOnboarding: false,
          };
        }
        return persisted as SettingsState;
      },
    },
  ),
);
