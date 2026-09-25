import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TextLink } from '@/components/ui/text-link';
import { BanglaFontFamilies, FontFamilies, Spacing } from '@/constants/theme';
import { useTints } from '@/hooks/use-tints';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';

/**
 * Reusable shell for the three onboarding screens (Welcome / Opportunities /
 * Community). Pure white background, no hero photo — the brand pill ("KSE")
 * sits top-left and an inline "Skip" link sits top-right. Below them sits
 * the eyebrow chip (when shown), a pill-stack headline (line 1 dark, line 2
 * brand primary), body copy, 3-dot pagination, a full-width purple CTA, and
 * the "All have an account? Login" footer.
 *
 * Tapping Skip or the CTA on the final step calls `finish()`, which sets
 * `hasCompletedOnboarding` and routes to /(auth)/login or /(tabs).
 *
 * Design references (Bengali copy + layout, no photos):
 *  - Welcome:       01._welcome_kse_onboarding/screen.png + Image #8 (mock)
 *  - Opportunities: 02._opportunities_kse_onboarding/screen.png + Image #8
 *  - Community:     03._community_kse_onboarding/screen.png + Image #8
 *
 * Bengali paragraphs render in Hind Siliguri (Poppins has no Bengali
 * glyphs); button labels stay English ("Start" / "Next" / "Skip" / "Login").
 */
export interface OnboardingStepProps {
  step: 1 | 2 | 3;
  headline: [string, string]; // line 1 (dark chip) + line 2 (primary chip)
  body: string;
  /** 'Next' for step 2; 'Start' for steps 1 and 3. */
  primaryLabel: 'Start' | 'Next';
  /**
   * Whether to show the eyebrow chip above the headline. The mockup's
   * opportunities screen has no eyebrow — its headline sits directly above
   * the body. Welcome + community show a short indigo-tinted eyebrow chip.
   */
  showEyebrow?: boolean;
  eyebrow?: string;
}

/** Pure-white background. */
const CARD_BG = '#FFFFFF';

const STEP_ROUTES = {
  1: '/onboarding/opportunities',
  2: '/onboarding/community',
  3: null, // final step → out of onboarding
} as const;

export function OnboardingStep({
  step,
  headline,
  body,
  primaryLabel,
  showEyebrow = false,
  eyebrow,
}: OnboardingStepProps) {
  const colors = useTheme();
  const tints = useTints();
  const session = useAuthStore((s) => s.session);
  const completeOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);

  const finish = () => {
    completeOnboarding(true);
    router.replace(session ? '/(tabs)' : '/(auth)/login');
  };

  const advance = () => {
    const next = STEP_ROUTES[step];
    if (next) router.push(next);
    else finish();
  };

  return (
    <View style={[styles.root, { backgroundColor: CARD_BG }]}>
      {/*
        Top safe-area row — brand pill on the left, inline Skip on the right.
        Sits inside the safe area so it never collides with the status bar.
      */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.brandPill}>
          <ThemedText style={styles.brandLabel}>KSE</ThemedText>
        </View>
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          hitSlop={12}
          style={({ pressed }) => [styles.skipLink, pressed && styles.pressed]}
        >
          <ThemedText style={[styles.skipLabel, { color: colors.heading }]}>
            Skip
          </ThemedText>
        </Pressable>
      </SafeAreaView>

      {/*
        Card content sits directly below the top bar. No hero — the screen
        is a single white surface with all the headline + body + CTA content.
      */}
      <View style={styles.card}>
        <View style={styles.cardInner}>
          {showEyebrow && eyebrow ? (
            <View style={[styles.eyebrowChip, { backgroundColor: tints.indigo.bg }]}>
              <View style={[styles.eyebrowDot, { backgroundColor: colors.primary }]} />
              <ThemedText style={[styles.eyebrowLabel, { color: colors.primary }]}>
                {eyebrow}
              </ThemedText>
            </View>
          ) : null}

          {/*
            Headline pill-stack: line 1 sits in a dark chip, line 2 in a
            brand-primary chip, stacked vertically with a small gap.
            self-start so the chip width hugs its content (matches the mock).
          */}
          <View style={styles.headlineWrap}>
            <View
              style={[
                styles.headlineChip,
                { backgroundColor: colors.heading },
              ]}
            >
              <ThemedText style={[styles.headlineText, { color: CARD_BG }]}>
                {headline[0]}
              </ThemedText>
            </View>
            <View
              style={[
                styles.headlineChip,
                { backgroundColor: colors.primary },
              ]}
            >
              <ThemedText style={[styles.headlineText, { color: '#FFFFFF' }]}>
                {headline[1]}
              </ThemedText>
            </View>
          </View>

          <ThemedText
            style={[
              styles.body,
              { color: colors.textSecondary, fontFamily: BanglaFontFamilies.regular },
            ]}
          >
            {body}
          </ThemedText>

          <PaginationDots current={step} />

          <PrimaryCta label={primaryLabel} onPress={advance} />

          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
              All have an account?{' '}
            </ThemedText>
            <TextLink href="/(auth)/login">Login</TextLink>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Full-width purple CTA matching the design (height ~52 px, label + trailing
 * arrow). Uses Ionicons because `@expo/vector-icons` is already a direct
 * dependency and `PrimaryButton` has no icon slot.
 */
function PrimaryCta({ label, onPress }: { label: 'Start' | 'Next'; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: colors.primary },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText style={[styles.ctaLabel, { color: colors.onPrimary }]}>{label}</ThemedText>
      <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
    </Pressable>
  );
}

/**
 * Three-dot pagination indicator — active dot is a wide pill in the brand
 * primary colour, inactive ones are small squares in the border colour.
 */
function PaginationDots({ current }: { current: 1 | 2 | 3 }) {
  const colors = useTheme();
  return (
    <View style={styles.dots}>
      {[1, 2, 3].map((s) => {
        const active = s === current;
        return (
          <View
            key={s}
            style={[
              styles.dot,
              {
                width: active ? 24 : 8,
                backgroundColor: active ? colors.primary : colors.border,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#0E0E10',
  },
  brandLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    letterSpacing: 0.6,
  },
  skipLink: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  skipLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.6,
  },
  card: {
    flex: 1,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  eyebrowChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '95%',
  },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  eyebrowLabel: {
    fontFamily: BanglaFontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  headlineWrap: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  headlineChip: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headlineText: {
    fontFamily: BanglaFontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: Spacing.one,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  cta: {
    minHeight: 52,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.one,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
