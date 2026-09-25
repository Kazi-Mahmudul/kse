import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Opportunities — second onboarding screen.
 *
 * Bengali copy per `02._opportunities_kse_onboarding/screen.png` and the
 * Image #8 mock. The mock omits the eyebrow chip — headline sits directly
 * above the body. Skip link top-right, KSE brand pill top-left.
 */
export default function OpportunitiesScreen() {
  return (
    <OnboardingStep
      step={2}
      image={require('@/assets/images/onboarding/opportunities.jpg')}
      headline={['তোমার জন্য সঠিক', 'সুযোগ খুঁজে নাও।']}
      body="তোমার শিক্ষা, দক্ষতা ও আগ্রহের ভিত্তিতে যুব সুযোগ খুঁজে নাও, কাঙ্ক্ষিত জবের নেক্সট সুযোগ।"
      primaryLabel="Next"
    />
  );
}
