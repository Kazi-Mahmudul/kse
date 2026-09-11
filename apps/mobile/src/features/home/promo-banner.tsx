import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Flat-illustration palette. Fixed rather than themed: these sit on top of the
 * indigo gradient in both color schemes, so they are part of the artwork, not
 * the app chrome (same rationale as the fixed shadow color in tabs-bar.tsx).
 */
const ART = {
  disc: 'rgba(255,255,255,0.10)',
  accent: 'rgba(99,102,241,0.30)', // indigo-500 / 30
  glow: 'rgba(255,255,255,0.05)',
  avatarBg: '#E0E7FF', // indigo-100
  avatarBorder: 'rgba(255,255,255,0.60)',
  head: '#92400E', // amber-800
  body: '#6366F1', // indigo-500
  laptop: '#E2E8F0', // slate-200
  laptopEdge: '#CBD5E1', // slate-300
  screen: '#0EA5E9', // sky-500
  subtitle: '#E0E7FF', // indigo-100
} as const;

/**
 * Home promo banner (design 03._home_kse): diagonal indigo→blue gradient,
 * copy + "Explore" pill on the left, flat student-with-laptop illustration on
 * the right, decorative circles behind both.
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

        {/* Flat student-with-laptop illustration */}
        <View style={styles.art}>
          <View style={styles.artDisc} />
          <View style={styles.artStack}>
            <View style={styles.avatar}>
              <View style={styles.head} />
              <View style={styles.body} />
            </View>
            <View style={styles.laptop}>
              <View style={styles.screen} />
            </View>
            <View style={styles.laptopBase} />
          </View>
        </View>
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
    minHeight: 125,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glowCircle: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 128,
    height: 128,
    borderRadius: 999,
    backgroundColor: ART.glow,
    pointerEvents: 'none',
  },
  accentCircle: {
    position: 'absolute',
    right: 80,
    top: -32,
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
    fontSize: 14,
    lineHeight: 18,
  },
  subtitle: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    lineHeight: 14,
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
  art: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  artDisc: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: ART.disc,
  },
  artStack: {
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: ART.avatarBorder,
    backgroundColor: ART.avatarBg,
    overflow: 'hidden',
    alignItems: 'center',
  },
  head: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: ART.head,
    marginTop: 8,
  },
  body: {
    width: 40,
    height: 28,
    borderRadius: 999,
    backgroundColor: ART.body,
    marginTop: 4,
  },
  laptop: {
    width: 48,
    height: 28,
    marginTop: -12,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderWidth: 1,
    borderColor: ART.laptopEdge,
    backgroundColor: ART.laptop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    width: 32,
    height: 16,
    borderRadius: 2,
    backgroundColor: ART.screen,
  },
  laptopBase: {
    width: 56,
    height: 6,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: ART.laptopEdge,
  },
});
