import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Community — final onboarding screen.
 *
 * Bengali copy per `03._community_kse_onboarding/screen.png` and Image #8.
 * Same chip-stack headline + eyebrow as Welcome. Tapping Start finishes
 * onboarding: sets `hasCompletedOnboarding` and routes to /(auth)/login or
 * /(tabs).
 */
export default function CommunityScreen() {
  return (
    <OnboardingStep
      step={3}
      eyebrow="স্টুডেন্ট কমিউনিটি"
      showEyebrow
      headline={['একসাথে শিখি,', 'একসাথে এগিয়ে যাই।']}
      body="শিক্ষার্থী কমিউনিটি, আলাপচারী ও নতুন সুযোগের সাথে যুক্ত থাকো।"
      primaryLabel="Start"
    />
  );
}
