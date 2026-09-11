import { Platform } from 'react-native';

/**
 * Blur the focused DOM element (web only). Two focus pitfalls need it:
 *
 * 1. Navigation: expo-router keeps covered stack screens mounted but marks
 *    them `aria-hidden` (its Screen element, `aria-hidden={!focused}`). The
 *    button that triggered the push keeps DOM focus, so Chrome blocks the
 *    hide ("Blocked aria-hidden … descendant retained focus"). The root
 *    Stack blurs on every state change (src/app/_layout.tsx) — listeners
 *    fire during dispatch, before the covered screen commits.
 * 2. Modals: RNW's Modal focus trap captures `document.activeElement` on
 *    mount and restores focus to it on close. Sheets blur in their trigger's
 *    onPress so focus cleanly enters the dialog instead of lingering on the
 *    trigger (see select-field / search-bar filter handlers).
 *
 * No-op on native.
 */
export function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  (document.activeElement as HTMLElement | null)?.blur?.();
}
