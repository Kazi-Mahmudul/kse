import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Community screen — final onboarding step.
 *
 * "Stay together, grow together." (line 2 in brand purple).
 * Tapping Start exits onboarding: sets `hasCompletedOnboarding` and
 * routes to /(auth)/login (signed-out) or /(tabs) (signed-in).
 */
export default function CommunityScreen() {
  return (
    <OnboardingStep
      step={3}
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      image={require('@/assets/images/onboarding/community.png')}
      eyebrow="Be part of the community"
      headline={['Stay together,', 'grow together.']}
      body="Join student communities, chat with mentors and make new friends from your area."
      primaryLabel="Start"
      showSkip={true}
    />
  );
}
