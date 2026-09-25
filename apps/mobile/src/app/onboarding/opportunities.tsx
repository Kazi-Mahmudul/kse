import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Opportunities — second onboarding screen.
 *
 * Bengali copy per `02._opportunities_kse_onboarding/screen.png`. Skip pill is
 * shown (top-right, dark translucent). CTA label "Next" advances to community.
 */
export default function OpportunitiesScreen() {
  return (
    <OnboardingStep
      step={2}
      image={require('@/assets/images/onboarding/opportunities.jpg')}
      eyebrow="সুযোগ আবিষ্কার"
      headline={['তোমার জন্য সঠিক', 'সুযোগ খুঁজে নাও।']}
      body="তোমার শিক্ষা, দক্ষতা ও আগ্রহের ভিত্তিতে যুব সুযোগ খুঁজে নাও, কাঙ্ক্ষিত জবের নেক্সট সুযোগ।"
      primaryLabel="Next"
      showSkip={true}
    />
  );
}
