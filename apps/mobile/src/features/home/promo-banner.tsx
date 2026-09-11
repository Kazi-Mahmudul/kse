import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Hero cutout (students around a laptop) — alpha-restored from the studio
 *  source; see `assets/images/hero-students.png`. */
const HERO_ART = require('@/assets/images/hero-students.png');
/** Native pixel size of the asset — keeps the aspect ratio in sync with the file. */
const HERO_ART_ASPECT = 480 / 412;

/**
 * Fixed palette for artwork layered on the indigo gradient. Not themed: it
 * rides on the banner in both color schemes, like the banner art itself.
 */
const ART = {
  accent: 'rgba(99,102,241,0.30)', // indigo-500 / 30
  glow: 'rgba(255,255,255,0.05)',
  subtitle: '#E0E7FF', // indigo-100
} as const;

/**
 * Home promo banner (design 03._home_kse): diagonal indigo→blue gradient,
 * copy + "Explore" pill on the left, and the student-group photo cutout on
 * the right, anchored to the banner's bottom edge (the waist-up crop reads
 * as an intentional bleed) with decorative circles behind it.
 */
export function PromoBanner() {
  const colors = useTheme();
  const openInternships = () => router.push('/(tabs)/explore/internship');

  return (
    <View style={[styles.shadow, { boxShadow: `0px 6px 12px ${colors.primary}2E` }]}>
      <LinearGradient
        colors={[colors.bannerFrom, colors.bannerVia, colors.bannerTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        {/* Decorative background circles (clipped by the banner's overflow) */}
        <View style={styles.glowCircle} />
        <View style={styles.accentCircle} />

        <View style={styles.copy}>
          <ThemedText themeColor="onPrimary" style={styles.title}>
            Internship Opportunities
          </ThemedText>
          <ThemedText style={styles.subtitle}>Find the best internship for you</ThemedText>
          <Pressable
            onPress={openInternships}
            accessibilityRole="button"
            accessibilityLabel="Explore internship opportunities"
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: colors.background, boxShadow: `0px 1px 2px ${colors.shadow}` },
              pressed && styles.ctaPressed,
            ]}
          >
            <ThemedText themeColor="primary" style={styles.ctaLabel}>
              Explore
            </ThemedText>
          </Pressable>
        </View>

        {/* Student-group hero cutout, bottom-anchored so the waist-up crop
            bleeds off the banner edge; purely decorative. */}
        <Image
          source={HERO_ART}
          style={styles.heroArt}
          contentFit="contain"
          transition={200}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 24,
    elevation: 5,
  },
  banner: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
    minHeight: 156,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glowCircle: {
    position: 'absolute',
    right: -28,
    bottom: -36,
    width: 176,
    height: 176,
    borderRadius: 999,
    backgroundColor: ART.glow,
    pointerEvents: 'none',
  },
  accentCircle: {
    position: 'absolute',
    right: 96,
    top: -28,
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: ART.accent,
    pointerEvents: 'none',
  },
  copy: {
    maxWidth: '58%',
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  subtitle: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    color: ART.subtitle,
  },
  cta: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    elevation: 2,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  ctaLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 11,
    lineHeight: 15,
  },
  heroArt: {
    position: 'absolute',
    right: 4,
    bottom: 0,
    width: 150,
    aspectRatio: HERO_ART_ASPECT,
    // In style, not as a prop — react-native-web deprecates props.pointerEvents.
    pointerEvents: 'none',
  },
});
