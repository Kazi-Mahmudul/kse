import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';
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
 * Community). Owns the layout — full-bleed hero photo at the top fading into a
 * soft lavender card (`#FAF8FF`) with the KSE brand pill (top-left, always),
 * Skip pill (top-right, screens 2 & 3 only), eyebrow chip + two-line headline
 * (line 2 in brand purple) + body copy, 3-dot pagination, a full-width purple
 * primary CTA with a trailing arrow, and the "All have an account? Login"
 * footer.
 *
 * Tapping the CTA on screen 1 or 2 advances to the next screen; on screen 3
 * (or from Skip on screens 2 & 3) it exits onboarding via `finish()`, which
 * sets `hasCompletedOnboarding` and routes to /(auth)/login or /(tabs).
 *
 * Design references:
 *  - Welcome:         01._welcome_kse_onboarding/screen.png
 *  - Opportunities:   02._opportunities_kse_onboarding/screen.png
 *  - Community:       03._community_kse_onboarding/screen.png
 *
 * Copy language per design is Bengali (`HindSiliguri_700Bold`). Button labels
 * stay English ("Start" / "Next" / "Skip" / "Login") per spec.
 */
export interface OnboardingStepProps {
  step: 1 | 2 | 3;
  image: ImageSourcePropType;
  eyebrow: string;
  headline: [string, string]; // line 1 dark + line 2 purple
  body: string;
  /** Bengali body copy can span two visual lines on small screens — body itself is one string. */
  bodyClassName?: string;
  /** 'Next' for step 2; 'Start' for steps 1 and 3. */
  primaryLabel: 'Start' | 'Next';
  /** Show the top-right Skip pill (true on steps 2 & 3). */
  showSkip: boolean;
}

const STEP_ROUTES = {
  1: '/onboarding/opportunities',
  2: '/onboarding/community',
  3: null, // final step → out of onboarding
} as const;

/** Soft lavender card background sampled from the design (`#FAF8FF`). */
const CARD_BG = '#FAF8FF';
/** Slightly deeper lavender tint used inside the gradient fade. */
const CARD_BG_TINT = '#F3F1FE';
/** Skip pill background (translucent black) — design shows dark surface, not white. */
const SKILL_BG = 'rgba(15,15,20,0.55)';

export function OnboardingStep({
  step,
  image,
  eyebrow,
  headline,
  body,
  primaryLabel,
  showSkip,
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
        Hero photo: full-bleed, height pinned to ~46% of the viewport so it reads
        like a banner. A soft LinearGradient fades the lower edge into the card
        lavender so the photo doesn't terminate with a hard line.
      */}
      <View style={styles.hero}>
        <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(255,255,255,0)', `${CARD_BG_TINT}00`, CARD_BG]}
          locations={[0.55, 0.78, 1]}
          start={{ x: 0.5, y: 0.55 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fade}
        />

        {/*
          Top safe-area overlay. KSE brand pill is always shown (matches the
          three design mocks); Skip is conditionally shown on steps 2 & 3.
        */}
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <View style={styles.brandPill}>
            <Image
              source={require('@/assets/images/logo-glow.png')}
              style={styles.brandIcon}
              resizeMode="contain"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <ThemedText style={styles.brandLabel}>KSE</ThemedText>
          </View>
          {showSkip ? (
            <Pressable
              onPress={finish}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              hitSlop={8}
              style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
            >
              <ThemedText style={styles.skipLabel}>Skip</ThemedText>
            </Pressable>
          ) : null}
        </SafeAreaView>
      </View>

      {/*
        Card. Slightly overlaps the hero so the gradient blends naturally
        rather than terminating at a sharp seam.
      */}
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View style={[styles.eyebrowChip, { backgroundColor: tints.indigo.bg }]}>
            <View style={[styles.eyebrowDot, { backgroundColor: colors.primary }]} />
            <ThemedText style={[styles.eyebrowLabel, { color: colors.primary }]}>
              {eyebrow}
            </ThemedText>
          </View>

          <View>
            <ThemedText style={[styles.headline, { color: colors.heading, fontFamily: BanglaFontFamilies.bold }]}>
              {headline[0]}{' '}
              <ThemedText style={[styles.headline, { color: colors.primary, fontFamily: BanglaFontFamilies.bold }]}>
                {headline[1]}
              </ThemedText>
            </ThemedText>
          </View>

          <ThemedText style={[styles.body, { color: colors.textSecondary, fontFamily: BanglaFontFamilies.regular }]}>
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
 * Full-width purple CTA matching the Stitch design (button height ~52 px,
 * label + trailing arrow). Uses Ionicons because `@expo/vector-icons` is
 * already a direct dependency.
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
 * Renders the same on every step so the user always knows where they are.
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
  hero: {
    height: '46%',
    width: '100%',
    overflow: 'hidden',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  topBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,15,20,0.72)',
    // Subtle elevation so the pill floats above the photo.
    elevation: 2,
  },
  brandIcon: {
    width: 18,
    height: 18,
  },
  brandLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  skip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SKILL_BG,
  },
  skipLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  card: {
    flex: 1,
    marginTop: -Spacing.four,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
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
  headline: {
    // fontFamily is set inline to BanglaFontFamilies.bold so the Bengali
    // script renders. Line-height tracks a 26/32 two-line headline cleanly.
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  body: {
    // fontFamily is set inline to BanglaFontFamilies.regular so the Bengali
    // glyphs render in Hind Siliguri rather than Poppins (which has no
    // Bengali coverage).
    fontSize: 14,
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
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
