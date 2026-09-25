import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextLink } from '@/components/ui/text-link';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTheme } from '@/hooks/use-theme';

/**
 * Reusable shell for the three onboarding screens (Welcome / Opportunities /
 * Community). Owns the layout — hero photo at the top fading into a white
 * card with eyebrow chip, two-line headline, body copy, pagination dots,
 * full-width primary CTA, and the "All have an account? Login" footer.
 *
 * Screens 2 and 3 add a top-right Skip pill; screen 1 omits it. The CTA
 * label flips between "Next" (middle step) and "Start" (steps 1 and 3) and
 * routes to the next onboarding screen or, on the final step, out of
 * onboarding entirely.
 *
 * All transitions go through `completeOnboarding()`, which sets the
 * persisted `hasCompletedOnboarding` flag and routes to `/login` for
 * signed-out users or `/(tabs)` for already-signed-in users. The auth
 * gate handles the rest.
 */
export interface OnboardingStepProps {
  step: 1 | 2 | 3;
  image: ImageSourcePropType;
  eyebrow: string;
  headline: [string, string]; // line 1 dark + line 2 purple
  body: string;
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Hero photo with soft fade to the white card. */}
      <View style={styles.hero}>
        <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(255,255,255,0)', colors.background]}
          start={{ x: 0.5, y: 0.55 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fade}
        />

        <SafeAreaView edges={['top']} style={styles.topBar}>
          {showSkip ? (
            <Pressable
              onPress={finish}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              hitSlop={8}
              style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
            >
              <ThemedText style={[styles.skipLabel, { color: colors.heading }]}>
                Skip
              </ThemedText>
            </Pressable>
          ) : null}
        </SafeAreaView>
      </View>

      {/* Card content sits over the lower part of the hero / fade boundary. */}
      <SafeAreaView edges={['bottom']} style={styles.card}>
        <View style={styles.cardInner}>
          <View style={[styles.eyebrowChip, { backgroundColor: colors.primary + '14' }]}>
            <View style={[styles.eyebrowDot, { backgroundColor: colors.primary }]} />
            <ThemedText style={[styles.eyebrowLabel, { color: colors.primary }]}>
              {eyebrow}
            </ThemedText>
          </View>

          <View>
            <ThemedText style={[styles.headline, { color: colors.heading }]}>
              {headline[0]}{' '}
              <ThemedText style={[styles.headline, { color: colors.primary }]}>
                {headline[1]}
              </ThemedText>
            </ThemedText>
          </View>

          <ThemedText themeColor="textSecondary" style={styles.body}>
            {body}
          </ThemedText>

          <PaginationDots current={step} />

          <PrimaryButton
            label={primaryLabel}
            onPress={advance}
            accessibilityLabel={primaryLabel}
          />

          <View style={styles.footer}>
            <ThemedText themeColor="textSecondary" style={styles.footerText}>
              All have an account?{' '}
            </ThemedText>
            <TextLink href="/(auth)/login">Login</TextLink>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/**
 * Three-dot pagination indicator — the active dot is a wide pill in the
 * brand primary colour, the inactive ones are small squares in the border
 * colour. Renders the same on every step so the user always knows where
 * they are in the flow.
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
    height: '42%',
    width: '100%',
    overflow: 'hidden',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  topBar: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  skip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    // Subtle elevation so the pill floats above the photo.
    elevation: 2,
  },
  skipLabel: {
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
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  eyebrowChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  eyebrowLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  headline: {
    fontFamily: FontFamilies.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: FontFamilies.regular,
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
