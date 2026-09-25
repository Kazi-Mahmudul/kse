import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Welcome — first of three onboarding screens.
 *
 * Copy is Bengali per the Stitch design (`01._welcome_kse_onboarding/screen.png`)
 * because Poppins has no Bengali coverage; the Bengali strings render in Hind
 * Siliguri Bold inside `<OnboardingStep>`. Button labels stay in English
 * (Start / Next / Skip / Login) per spec.
 *
 * Hero photo: `welcome.jpg` (group of students chatting) — bundled as a static
 * asset so the resolution stays predictable across devices.
 */
export default function WelcomeScreen() {
  return (
    <OnboardingStep
      step={1}
      image={require('@/assets/images/onboarding/welcome.jpg')}
      eyebrow="খুলনা ইকোস্টেম"
      headline={['তোমার স্বপ্নের পথ,', 'সুযোগগুলো এখন হাতের মুঠোয়']}
      body="ইন্টার্নশিপ, স্কলারশিপ, ইভেন্ট, ক্যারিয়ার নির্দেশনা ও ক্যারিয়ার সুযোগ — সবকিছু এক জায়গায়।"
      primaryLabel="Start"
      showSkip={false}
    />
  );
}
