import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Community — final onboarding screen.
 *
 * English eyebrow + CTA ("Student Community" / "Start") per the
 * English-only copy pass. Hero photo is `community.jpg` (single
 * student in a green kameez checking her phone in front of a heritage
 * building, swapped from the opportunities image so screen 3 shows the
 * single-student shot). Her face sits in the upper portion of the
 * frame, so the focal point is pinned to `'top'` — without that, the
 * cover-crop on taller / narrower phones cuts into her torso. Skip
 * pill shown top-right. Tapping "Start" finishes onboarding and routes
 * to /(auth)/login or /(tabs) depending on whether a session exists.
 * Headline + body stay in Bangla.
 */
export default function CommunityScreen() {
  return (
    <OnboardingStep
      step={3}
      image={require('@/assets/images/onboarding/community.jpg')}
      eyebrow="Student Community"
      headline={['একসাথে শিখি,', 'একসাথে এগিয়ে যাই।']}
      body="শিক্ষার্থী কমিউনিটি, আলোচনা ও নতুন সুযোগের সাথে যুক্ত থাকো।"
      primaryLabel="Start"
      showSkip={true}
      focalPoint="top"
    />
  );
}