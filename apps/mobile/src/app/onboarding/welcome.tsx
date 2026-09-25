import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Welcome — first of three onboarding screens.
 *
 * Bengali copy per `01._welcome_kse_onboarding/screen.png` and Image #8
 * (ChatGPT mock). Headline wraps as pill-stack: line 1 dark, line 2 brand
 * primary. Skip link sits top-right, brand pill sits top-left.
 */
export default function WelcomeScreen() {
  return (
    <OnboardingStep
      step={1}
      eyebrow="খুলনা ইকোস্টেম"
      showEyebrow
      headline={['তোমার স্বপ্নের পথ,', 'সুযোগগুলো এখন হাতের মুঠোয়']}
      body="ইন্টার্নশিপ, স্কলারশিপ, ইভেন্ট, ক্যারিয়ার নির্দেশনা ও ক্যারিয়ার সুযোগ — সবকিছু এক জায়গায়।"
      primaryLabel="Start"
    />
  );
}
