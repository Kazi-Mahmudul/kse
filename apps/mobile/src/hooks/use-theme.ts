/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, type ThemeColor } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Returns the color palette for the active scheme.
 *
 * The union return type avoids `Colors[scheme]` collapsing to `never` when TS
 * widens `theme` across the `'light' | 'dark'` ternary in strict mode.
 */
export function useTheme(): Record<ThemeColor, string> {
  const scheme = useColorScheme();
  const theme: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light';
  return Colors[theme] as unknown as Record<ThemeColor, string>;
}
