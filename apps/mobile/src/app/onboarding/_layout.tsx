import { Stack } from 'expo-router';

/**
 * Onboarding route group — three stacked screens (welcome → opportunities
 * → community). No auth gate inside this group: onboarding is shown to
 * both signed-in and signed-out users on first launch. The root layout's
 * `AuthGate` is what redirects to here when `hasCompletedOnboarding` is
 * false, and what redirects out to `/(auth)/login` or `/(tabs)` after
 * the user finishes.
 */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
