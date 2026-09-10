/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // Brand (docs/design/tokens.md)
    primary: '#4F46E5',
    primaryDark: '#7C3AED',
    onPrimary: '#ffffff',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#F43F5E',
    // Neutrals for the Home layout (design 03._home_kse, Tailwind slate scale)
    surfaceMuted: '#F8FAFC',
    border: '#F1F5F9',
    textMuted: '#94A3B8',
    heading: '#0F172A',
    bodyStrong: '#334155',
    // Promo banner gradient stops (indigo-600 → indigo-700 → blue-700)
    bannerFrom: '#4F46E5',
    bannerVia: '#4338CA',
    bannerTo: '#1D4ED8',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    // Brand (docs/design/tokens.md)
    primary: '#6366F1',
    primaryDark: '#8B5CF6',
    onPrimary: '#ffffff',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#FB7185',
    // Neutrals for the Home layout (design 03._home_kse, Tailwind slate scale)
    surfaceMuted: '#1A1B1E',
    border: '#2E3135',
    textMuted: '#6B7280',
    heading: '#ffffff',
    bodyStrong: '#D8DCE2',
    // Promo banner gradient stops, darkened one step for dark mode
    bannerFrom: '#4338CA',
    bannerVia: '#3730A3',
    bannerTo: '#1E40AF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Pastel tile tints for the Home "Quick Access" grid (design 03._home_kse).
 *
 * Kept as a separate export rather than nested under `Colors` on purpose: a
 * nested object would leak into the `ThemeColor` union that `ThemedText`
 * (`themeColor`) and `ThemedView` (`type`) index with, and `theme[key]` would
 * stop being a color string. Read it through `useTints()`.
 */
export const Tints = {
  light: {
    indigo: { bg: '#EEF2FF', border: '#E0E7FF', fg: '#4F46E5' },
    amber: { bg: '#FFFBEB', border: '#FEF3C7', fg: '#F59E0B' },
    sky: { bg: '#F0F9FF', border: '#E0F2FE', fg: '#0EA5E9' },
    purple: { bg: '#FAF5FF', border: '#F3E8FF', fg: '#9333EA' },
    fuchsia: { bg: '#FDF4FF', border: '#FAE8FF', fg: '#C026D3' },
    emerald: { bg: '#ECFDF5', border: '#D1FAE5', fg: '#059669' },
    teal: { bg: '#F0FDFA', border: '#CCFBF1', fg: '#0D9488' },
    slate: { bg: '#F1F5F9', border: '#E2E8F0', fg: '#475569' },
  },
  dark: {
    indigo: { bg: '#4F46E51F', border: '#4F46E533', fg: '#A5B4FC' },
    amber: { bg: '#F59E0B1F', border: '#F59E0B33', fg: '#FCD34D' },
    sky: { bg: '#0EA5E91F', border: '#0EA5E933', fg: '#7DD3FC' },
    purple: { bg: '#9333EA1F', border: '#9333EA33', fg: '#D8B4FE' },
    fuchsia: { bg: '#C026D31F', border: '#C026D333', fg: '#F0ABFC' },
    emerald: { bg: '#0596691F', border: '#05966933', fg: '#6EE7B7' },
    teal: { bg: '#0D94881F', border: '#0D948833', fg: '#5EEAD4' },
    slate: { bg: '#64748B1F', border: '#64748B33', fg: '#CBD5E1' },
  },
} as const;

export type TintKey = keyof typeof Tints.light;
export type Tint = (typeof Tints.light)[TintKey];

/** Poppins families, loaded in src/app/_layout.tsx (docs/design/tokens.md). */
export const FontFamilies = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
