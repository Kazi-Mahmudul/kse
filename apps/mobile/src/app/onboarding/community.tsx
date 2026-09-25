import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Community — final onboarding screen.
 *
 * Bengali copy per `03._community_kse_onboarding/screen.png`. Skip pill is
 * shown (top-right, dark translucent). Tapping Start finishes onboarding:
 * sets `hasCompletedOnboarding` and routes to /(auth)/login or /(tabs).
 */
export default function CommunityScreen() {
  return (
    <OnboardingStep
      step={3}
      image={require('@/assets/images/onboarding/community.jpg')}
      eyebrow="স্টুডেন্ট কমিউনিটি"
      headline={['একসাথে শিখি,', 'একসাথে এগিয়ে যাই।']}
      body="শিক্ষার্থী কমিউনিটি, আলাপচারী ও নতুন সুযোগের সাথে যুক্ত থাকো।"
      primaryLabel="Start"
      showSkip={true}
    />
  );
}
