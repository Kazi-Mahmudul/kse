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
 * Community). Layout is taken from the actual Stitch designs
 * (`01._welcome_kse_onboarding/screen.png`, etc.) — full-bleed hero photo
 * fading into a white card with: brand pill top-left (always shown),
 * Skip pill top-right (screens 2 & 3 only), eyebrow chip, two-line
 * headline (line 1 dark, line 2 brand primary — rendered as ONE inline
 * `<ThemedText>` so it wraps naturally), Bengali body, 3-dot pagination,
 * full-width purple CTA with trailing arrow, and the Bengali prompt +
 * English "Login" footer.
 *
 * Photos are cropped from the design screen.pngs (NOT the standalone
 * ChatGPT-generated photos) so the framing matches what Stitch produced.
 *
 * Button labels are English ("Start" / "Next" / "Skip" / "Login") per
 * spec; all other copy is Bengali and renders in Hind Siliguri (Poppins
 * has no Bengali glyphs).
 */
export interface OnboardingStepProps {
  step: 1 | 2 | 3;
  image: ImageSourcePropType;
  eyebrow: string;
  /**
   * Two-line headline. Rendered inline as a single `<ThemedText>` so it
   * wraps as one continuous block (line 2 follows line 1 visually).
   * Line 2 is coloured brand primary; line 1 stays dark.
   */
  headline: [string, string];
  body: string;
  /** 'Next' for step 2; 'Start' for steps 1 and 3. */
  primaryLabel: 'Start' | 'Next';
  /** Show the top-right Skip pill (true on steps 2 & 3). */
  showSkip: boolean;
}

/** Pure-white card background. */
const CARD_BG = '#FFFFFF';

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
        Hero photo. Pinned to ~50% of screen height so it reads like a
        banner. A 3-stop LinearGradient fades the lower edge into the
        white card so the photo doesn't terminate with a hard line.
      */}
      <View style={styles.hero}>
        <Image source={image} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.65)', CARD_BG]}
          locations={[0.55, 0.78, 1]}
          start={{ x: 0.5, y: 0.55 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fade}
          pointerEvents="none"
        />

        {/*
          Top safe-area overlay floats above the photo. Brand pill on the
          left (always shown — matches all three Stitch mocks). Skip pill
          on the right only on screens 2 & 3.
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
        Card. Overlaps the hero slightly so the gradient blends naturally
        rather than terminating at a seam.
      */}
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View style={[styles.eyebrowChip, { backgroundColor: tints.indigo.bg }]}>
            <View style={[styles.eyebrowDot, { backgroundColor: colors.primary }]} />
            <ThemedText style={[styles.eyebrowLabel, { color: colors.primary }]}>
              {eyebrow}
            </ThemedText>
          </View>

          {/*
            Two-line headline as ONE inline ThemedText so it wraps naturally.
            Line 1 in dark, line 2 in brand primary. The space between the
            two halves lets line 1 break before line 2 if the screen is
            narrow (matches the Stitch mocks).
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
              { color: colors.textSecondary, fontFamily: BanglaFontFamilies.regular },
            ]}
          >
            {body}
          </ThemedText>

          <PaginationDots current={step} />

          <PrimaryCta label={primaryLabel} onPress={advance} />

          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
              আগেই অ্যাকাউন্ট আছে?{' '}
            </ThemedText>
            <TextLink href="/(auth)/login">Login</TextLink>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Full-width purple CTA matching the Stitch design (height ~56 px, label +
 * trailing arrow). Uses Ionicons because `@expo/vector-icons` is already a
 * direct dependency and `PrimaryButton` has no icon slot.
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
    height: '50%',
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#0E0E10',
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
    letterSpacing: 0.6,
  },
  skip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#0E0E10',
    elevation: 2,
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
    fontFamily: BanglaFontFamilies.regular,
  },
});
