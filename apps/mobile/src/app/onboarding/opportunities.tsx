import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Opportunities screen — second of three onboarding steps.
 *
 * "Every opportunity you need in one place." (line 2 in brand purple).
 * Tapping Next advances to /onboarding/community. Skip pill is shown —
 * tapping it sets the `hasCompletedOnboarding` flag and routes to
 * /(auth)/login or /(tabs) depending on auth state.
 */
export default function OpportunitiesScreen() {
  return (
    <OnboardingStep
      step={2}
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      image={require('@/assets/images/onboarding/opportunities.png')}
      eyebrow="Discover opportunities"
      headline={['Every opportunity you need', 'in one place.']}
      body="Find internships, scholarships and events that match your interests and skills."
      primaryLabel="Next"
      showSkip={true}
    />
  );
}
