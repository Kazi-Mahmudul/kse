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
 * Community). Owns the layout — full-bleed hero photo at the top fading into
 * a pure-white card with a pill-stack headline (line 2 colored), body copy,
 * 3-dot pagination, a full-width purple primary CTA with a trailing arrow,
 * and the "All have an account? Login" footer.
 *
 * The brand pill ("KSE + leaf") sits top-left over the hero on all three
 * screens, and an inline "Skip" link sits top-right. Tapping Skip finishes
 * onboarding via `finish()`, which sets `hasCompletedOnboarding` and routes
 * to /(auth)/login or /(tabs).
 *
 * Design references (Bengali copy + layout):
 *  - Welcome:       01._welcome_kse_onboarding/screen.png + Image #8 (mock)
 *  - Opportunities: 02._opportunities_kse_onboarding/screen.png + Image #8
 *  - Community:     03._community_kse_onboarding/screen.png + Image #8
 *
 * The Bengali paragraphs render in Hind Siliguri (Poppins has no Bengali
 * glyphs); button labels stay English ("Start" / "Next" / "Skip" / "Login").
 */
export interface OnboardingStepProps {
  step: 1 | 2 | 3;
  image: ImageSourcePropType;
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

/** Pure-white card background (matches the new Image #8 mock). */
const CARD_BG = '#FFFFFF';
/** Source photo aspect — 420:720, kept as width=100% so `cover` never crops faces. */
const PHOTO_ASPECT = 420 / 720;

const STEP_ROUTES = {
  1: '/onboarding/opportunities',
  2: '/onboarding/community',
  3: null, // final step → out of onboarding
} as const;

export function OnboardingStep({
  step,
  image,
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
        Hero photo. Sizing uses source aspect (420:720) so `cover` fills the
        width and lets the height fall out naturally — never crops faces.
        Fade gradient drops into the white card from ~55% down.
      */}
      <View style={styles.hero}>
        <Image
          source={image}
          style={[styles.heroImage, { aspectRatio: PHOTO_ASPECT }]}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.65)', CARD_BG]}
          locations={[0.55, 0.78, 1]}
          start={{ x: 0.5, y: 0.55 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fade}
          pointerEvents="none"
        />

        {/*
          Top safe-area overlay. Brand pill on the left, inline Skip on the
          right. Both float above the photo.
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
      </View>

      {/*
        Card. No overlap this time — the hero already owns its own height
        and the gradient blends to white. Contents sit in a clean padding.
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
 * Full-width purple CTA matching the Stitch + mock design (height ~52 px,
 * label + trailing arrow). Uses Ionicons because `@expo/vector-icons` is
 * already a direct dependency and `PrimaryButton` has no icon slot.
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
  hero: {
    width: '100%',
  },
  heroImage: {
    width: '100%',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  brandIcon: {
    width: 18,
    height: 18,
  },
  brandLabel: {
    color: '#0E0E10',
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    letterSpacing: 0.4,
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
    paddingTop: Spacing.three,
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
