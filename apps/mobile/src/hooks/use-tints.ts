import { Tints } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Resolved pastel tile tints for the current color scheme — the `useTheme()`
 * counterpart for the Home "Quick Access" palette (design 03._home_kse).
 */
export function useTints() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;
  return Tints[theme];
}
