import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BanglaFontFamilies } from '@/constants/theme';
import type { PromoBanner } from '@/features/home/promo-banners';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Fixed palette layered on top of the gradients. Not themed: it rides on the
 * banner in both color schemes, like the photo blend itself.
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
 * One hero carousel slide, composed like a bKash promo banner: the slide's
 * brand gradient carries the Bangla copy + CTA on the left, while a real
 * photograph is anchored to the right and blended into the colour with a
 * horizontal gradient overlay — the person/scene emerges from the brand
 * colour instead of being hard-cropped against it.
 */
export function PromoSlide({ banner }: { banner: PromoBanner }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useTheme();
  /** First stop of the slide gradient — the colour the photo blends from. */
  const base = banner.gradient[scheme][0];

  return (
    <LinearGradient
      colors={banner.gradient[scheme]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.slide}
    >
      {/* Hero photograph, anchored right and covered to the slide's edge */}
      <Image
        source={{ uri: banner.photo }}
        style={styles.photo}
        contentFit="cover"
        transition={250}
        accessible={false}
      />

      {/* The blend: solid brand colour over the copy side, dissolving to
          transparent across the photo so it emerges from the gradient. */}
      <LinearGradient
        colors={[withAlpha(base, 0.97), withAlpha(base, 0.86), withAlpha(base, 0)]}
        locations={[0, 0.38, 0.78]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.photoBlend}
      />

      {/* Soft bottom scrim — keeps the pagination dots legible over busy
          photo bottoms without dimming the headline area. */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(15,23,42,0.25)']}
        style={styles.bottomScrim}
      />

      {/* Decorative background circles (clipped by the slide's overflow) */}
      <View style={styles.glowCircle} />
      <View style={[styles.accentCircle, { backgroundColor: withAlpha(banner.accent, 0.28) }]} />

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
  photo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '62%',
    // In style, not as a prop — react-native-web deprecates props.pointerEvents.
    pointerEvents: 'none',
  },
  photoBlend: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    pointerEvents: 'none',
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
  copy: {
    flex: 1,
    maxWidth: '58%',
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
