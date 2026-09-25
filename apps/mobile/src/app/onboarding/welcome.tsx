import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Welcome — first onboarding screen.
 *
 * English eyebrow + CTA ("Khulna Student Ecosystem" / "Start") per the
 * English-only copy pass. Hero photo is `welcome.jpg` (five students
 * around a MacBook on outdoor steps with the "শিক্ষা / সচেতনতা /
 * সমৃদ্ধি" signpost in the background). Subjects are centred so a
 * `'center'` focal point keeps them in frame across phone sizes. Skip
 * pill shown top-right (matches the Stitch mock). The headline and
 * body copy stay in Bangla.
 */
export default function WelcomeScreen() {
  return (
    <OnboardingStep
      step={1}
      image={require('@/assets/images/onboarding/welcome.jpg')}
      eyebrow="Khulna Student Ecosystem"
      headline={['তোমার স্বপ্নের পথে,', 'সুযোগগুলো']}
      body="স্কলারশিপ, ইন্টার্নশিপ, টিউশন, কমিউনিটি ও ক্যারিয়ার সুযোগ—সবকিছু এক জায়গায়।"
      primaryLabel="Start"
      showSkip={true}
      focalPoint="center"
    />
  );
}