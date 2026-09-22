import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BanglaFontFamilies } from '@/constants/theme';
import { BannerArt } from '@/features/home/banner-art';
import type { PromoBanner } from '@/features/home/promo-banners';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Fixed palette layered on top of the gradients. Not themed: it rides on the
 * banner in both color schemes, like the banner art itself.
 */
const ART = {
  glow: 'rgba(255,255,255,0.05)',
  subtitle: 'rgba(255,255,255,0.85)',
} as const;

/** Append an alpha channel to a `#RRGGBB` accent (used by the decor circle). */
function withAlpha(hex: string, alpha: number): string {
  return `#${hex.slice(1)}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

/**
 * One hero carousel slide: diagonal gradient, Bangla copy + CTA pill on the
 * left, and student artwork anchored to the right — the same composition as
 * the retired single promo banner, parameterised per slide.
 */
export function PromoSlide({ banner }: { banner: PromoBanner }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useTheme();

  return (
    <LinearGradient
      colors={banner.gradient[scheme]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.slide}
    >
      {/* Decorative background circles (clipped by the slide's overflow) */}
      <View style={styles.glowCircle} />
      <View style={[styles.accentCircle, { backgroundColor: withAlpha(banner.accent, 0.3) }]} />

      {/* Artwork first, so long Bangla copy can overlap its soft backdrop */}
      <View style={[styles.art, styles[banner.art === 'internship-photo' ? 'artPhoto' : 'artSvg']]}>
        <BannerArt art={banner.art} accent={banner.accent} />
      </View>

      <View style={styles.copy}>
        <ThemedText themeColor="onPrimary" style={styles.title} numberOfLines={2}>
          {banner.title}
        </ThemedText>
        <ThemedText style={styles.subtitle} numberOfLines={3}>
          {banner.subtitle}
        </ThemedText>
        <Pressable
          onPress={() => router.push(banner.href)}
          accessibilityRole="button"
          accessibilityLabel={banner.ctaA11y}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.background, boxShadow: `0px 1px 2px ${colors.shadow}` },
            pressed && styles.ctaPressed,
          ]}
        >
          <ThemedText themeColor="primary" style={styles.ctaLabel}>
            {banner.cta}
          </ThemedText>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
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
    pointerEvents: 'none',
  },
  art: {
    position: 'absolute',
    // In style, not as a prop — react-native-web deprecates props.pointerEvents.
    pointerEvents: 'none',
  },
  artPhoto: {
    right: 4,
    bottom: 0,
    width: 148,
  },
  artSvg: {
    right: 0,
    bottom: 4,
    width: 128,
    height: 128,
  },
  copy: {
    flex: 1,
    maxWidth: '60%',
  },
  title: {
    fontFamily: BanglaFontFamilies.bold,
    fontSize: 15,
    lineHeight: 23,
  },
  subtitle: {
    fontFamily: BanglaFontFamilies.regular,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
    color: ART.subtitle,
  },
  cta: {
    marginTop: 8,
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
    fontFamily: BanglaFontFamilies.semiBold,
    fontSize: 11,
    lineHeight: 16,
  },
});
