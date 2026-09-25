import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Welcome — first onboarding screen.
 *
 * Bengali copy per the Stitch mock (`01._welcome_kse_onboarding/screen.png`).
 * Hero photo is `welcome.jpg` (cropped from the design screen.png, with the
 * Stitch status bar + brand pill + Skip pill stripped so we render those
 * ourselves in RN). No Skip pill on this step (only screens 2 & 3).
 * CTA label "Start" advances to /onboarding/opportunities.
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
