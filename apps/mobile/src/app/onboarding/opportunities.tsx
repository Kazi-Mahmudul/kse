import { OnboardingStep } from '@/features/onboarding/onboarding-step';

/**
 * Opportunities — second onboarding screen.
 *
 * English eyebrow + CTA ("Opportunities" / "Next") per the English-only
 * copy pass. Hero photo is `opportunities.jpg` (four students standing
 * together in front of a red-brick campus building, swapped from the
 * community image so screen 2 shows the group shot). Subjects are
 * centred, so `'center'` focal point keeps them in frame across phone
 * sizes. Skip pill shown top-right. Headline + body stay in Bangla.
 */
export default function OpportunitiesScreen() {
  return (
    <OnboardingStep
      step={2}
      image={require('@/assets/images/onboarding/opportunities.jpg')}
      eyebrow="Opportunities"
      headline={['তোমার জন্য সঠিক', 'সুযোগ খুঁজে নাও।']}
      body="তোমার শিক্ষা, দক্ষতা ও আগ্রহের ভিত্তিতে খুঁজে নাও তোমার জন্য উপযুক্ত সুযোগ।"
      primaryLabel="Next"
      showSkip={true}
      focalPoint="center"
    />
  );
}