import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Welcome screen — first of three onboarding steps.
 *
 * "Your surroundings, opportunities for you" (line 2 in brand purple).
 * Tapping Start advances to /onboarding/opportunities. No Skip pill on
 * this step (only screens 2 and 3).
 */
export default function WelcomeScreen() {
  return (
    <OnboardingStep
      step={1}
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      image={require('@/assets/images/onboarding/welcome.png')}
      eyebrow="Khulna student ecosystem"
      headline={['Your surroundings,', 'opportunities for you']}
      body="Internships, scholarships, events, mentorships and careers — all in one place."
      primaryLabel="Start"
      showSkip={false}
    />
  );
}
