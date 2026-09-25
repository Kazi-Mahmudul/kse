import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ImageContentPosition, ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BanglaFontFamilies, FontFamilies, Spacing } from '@/constants/theme';
import { useTints } from '@/hooks/use-tints';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';

/**
 * Reusable shell for the three onboarding screens (Welcome / Opportunities /
 * Community). Layout follows the Stitch designs (`01._welcome_kse_onboarding`,
 * `02._opportunities_kse_onboarding`, `03._community_kse_onboarding`) and is
 * deliberately responsive:
 *
 * - The hero photo uses `expo-image` with `contentFit: cover` plus a per-screen
 *   `focalPoint` so the subjects stay in frame across phone sizes (small SE up
 *   to large modern phones, portrait + landscape-ish aspect ratios). The
 *   `Image` component picks an appropriate focal point at render time, so
 *   cropping adapts to each device.
 * - Hero height is pinned to a *constant fraction* of screen height (~46%),
 *   not a fixed pixel value. Combined with the focal point it never
 *   aggressively crops heads/torsos — the photo always reads as a banner
 *   above a card rather than a clipped square.
 * - The card surfaces and the bottom-of-hero fade use the active theme's
 *   `background` so dark mode looks intentional (a true dark surface, not an
 *   inverted white card).
 *
 * All copy is Bengali (Hind Siliguri) — Poppins is the Latin display font but
 * has no Bengali glyphs. The "KSE" pill label, skip pill, and "Login" link
 * stay in Poppins (Latin only).
 *
 * The brand pill and skip pill float over the photo as dark translucent
 * surfaces (mirrors the Stitch mocks — same look in light and dark mode).
 */
export interface OnboardingStepProps {
  step: 1 | 2 | 3;
  image: ImageSource;
  eyebrow: string;
  /**
   * Two-line headline. Rendered inline as a single `<ThemedText>` so it
   * wraps naturally. Line 2 is coloured brand primary; line 1 stays in
   * `colors.heading` so dark mode flips to light text automatically.
   */
  headline: [string, string];
  body: string;
  /** Bengali CTA label (e.g. `শুরু করি`, `পরের ধাপ`). */
  primaryLabel: string;
  /** Show the top-right Skip pill. Stitch shows it on all three screens. */
  showSkip: boolean;
  /**
   * Where the photo's focal point sits inside the hero frame. Per-screen
   * because each photo has subjects in a different position. Accepts any
   * expo-image `contentPosition` value (string shorthand or object form,
   * e.g. `'center'`, `'top'`, `{ top: 0.15 }`).
   */
  focalPoint?: ImageContentPosition;
}

const STEP_ROUTES = {
  1: '/onboarding/opportunities',
  2: '/onboarding/community',
  3: null, // final step → out of onboarding
} as const;

export function OnboardingStep({
  step,
  image,
  eyebrow,
  headline,
  body,
  primaryLabel,
  showSkip,
  focalPoint = 'center',
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

  // Fade the bottom of the hero into the card surface — must follow the
  // active theme's background, not a hardcoded white, or dark mode ends up
  // with a glowing white stripe under the photo. Declared `as const` so the
  // tuple types satisfy LinearGradient's readonly signature.
  const fadeColors = ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', colors.background] as const;
  const fadeLocations = [0, 0.55, 1] as const;

  // Translucent dark pills that float over the photo. Stay dark in both
  // schemes — they're sitting on top of an image, not the screen surface.
  const pillBg = 'rgba(15,23,42,0.55)';
  const pillBorder = 'rgba(255,255,255,0.15)';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/*
        Hero photo. Pinned to ~46% of screen height — just enough to read
        as a banner without forcing aggressive subject cropping on
        taller/narrower phones. focalPoint keeps subjects in frame.
      */}
      <View style={styles.hero}>
        <Image
          source={image}
          style={styles.heroImage}
          contentFit="cover"
          contentPosition={focalPoint}
          transition={250}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        {/* Top vignette so the iOS status bar stays readable on bright photos. */}
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']}
          locations={[0, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.18 }}
          style={styles.topVignette}
          pointerEvents="none"
        />
        {/* Bottom fade — blends the photo into the themed card surface. */}
        <LinearGradient
          colors={fadeColors}
          locations={fadeLocations}
          start={{ x: 0.5, y: 0.55 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fade}
          pointerEvents="none"
        />

        {/* Top safe-area overlay: brand pill (left) + skip pill (right). */}
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <View style={[styles.brandPill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
            <View style={[styles.brandIconWrap, { backgroundColor: colors.primary }]}>
              <Ionicons name="school" size={12} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.brandLabel}>KSE</ThemedText>
          </View>
          {showSkip ? (
            <Pressable
              onPress={finish}
              accessibilityRole="button"
              accessibilityLabel="Skip"
              hitSlop={8}
              style={({ pressed }) => [
                styles.skip,
                { backgroundColor: pillBg, borderColor: pillBorder },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.skipLabel}>Skip</ThemedText>
            </Pressable>
          ) : null}
        </SafeAreaView>
      </View>

      {/* Card overlaps the hero so the gradient blends rather than seams. */}
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View style={[styles.eyebrowChip, { backgroundColor: tints.indigo.bg }]}>
            <View style={[styles.eyebrowDot, { backgroundColor: colors.primary }]} />
            <ThemedText
              style={[
                styles.eyebrowLabel,
                { color: colors.primary, fontFamily: BanglaFontFamilies.semiBold },
              ]}
            >
              {eyebrow}
            </ThemedText>
          </View>

          {/*
              Headline as ONE inline ThemedText so line 2 follows line 1.
              Line 1 in `colors.heading` (auto-flips in dark mode); line 2
              in `colors.primary`. The space between halves lets line 1
              break before line 2 on narrow screens.
            */}
          <ThemedText
            style={[
              styles.headline,
              { color: colors.heading, fontFamily: BanglaFontFamilies.bold },
            ]}
          >
            {headline[0]}{' '}
            <ThemedText
              style={[
                styles.headline,
                { color: colors.primary, fontFamily: BanglaFontFamilies.bold },
              ]}
            >
              {headline[1]}
            </ThemedText>
          </ThemedText>

          <ThemedText
            style={[
              styles.body,
              {
                color: colors.textSecondary,
                fontFamily: BanglaFontFamilies.regular,
              },
            ]}
          >
            {body}
          </ThemedText>

          <PaginationDots current={step} />

          <PrimaryCta label={primaryLabel} onPress={advance} />

          <View style={styles.footer}>
            <ThemedText
              style={[styles.footerText, { color: colors.textSecondary }]}
            >
              Already have an account?
            </ThemedText>
            {/*
              Inline Login link. Must call `finish()` rather than using
              TextLink to /login — the root AuthGate redirects back to
              /onboarding/welcome whenever `hasCompletedOnboarding` is
              still false, which would silently swallow the click.
              ) */}
            <Pressable
              onPress={finish}
              accessibilityRole="link"
              accessibilityLabel="Login"
              hitSlop={6}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <ThemedText style={[styles.footerLink, { color: colors.primary }]}>
                Login
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Full-width primary CTA matching the Stitch design — ~56 px tall, brand
 * primary background, Bengali label + trailing arrow. The shadow uses
 * `colors.primary` so dark mode gets the lighter indigo glow.
 */
function PrimaryCta({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.cta,
        {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
        },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        style={[
          styles.ctaLabel,
          { color: colors.onPrimary, fontFamily: BanglaFontFamilies.semiBold },
        ]}
      >
        {label}
      </ThemedText>
      <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
    </Pressable>
  );
}

/**
 * Three-dot pagination — active step is a wide pill in brand primary;
 * inactive dots are small circles in `colors.border`.
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
                width: active ? 28 : 8,
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
    // Constant fraction so cropping stays predictable across screen sizes.
    // 46% reads as a banner and avoids aggressive subject cropping on
    // taller phones (where a 50% hero forces heavy horizontal cuts on
    // 2:3 portrait photos).
    height: '46%',
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  topVignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 90,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
  },
  brandIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    letterSpacing: 0.6,
  },
  skip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
  },
  skipLabel: {
    color: '#FFFFFF',
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
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  headline: {
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.4,
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
    minHeight: 56,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaLabel: {
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
    fontFamily: FontFamilies.regular,
  },
  footerLink: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FontFamilies.semiBold,
  },
});