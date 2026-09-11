import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressRing } from '@/components/ui/progress-ring';
import { FontFamilies } from '@/constants/theme';
import { profileCompletion } from '@/features/profile/completion';
import { useMyProfile, useMySkillIds } from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * Decorative glow palette for the hero card. Fixed (not themed) because the
 * cyan accent and translucent glows sit on top of the gradient in both color
 * schemes — same rationale as `promo-banner.tsx`'s `ART` constant.
 */
const HERO_ART = {
  glowPrimary: 'rgba(59, 130, 246, 0.20)', // blue-400 / 20 — large blurred disc
  glowSecondary: 'rgba(165, 180, 252, 0.15)', // indigo-300 / 15 — small disc
  ringTrack: 'rgba(255, 255, 255, 0.20)',
  ringFill: '#00E5FF', // spec's brand cyan
  ctaBorder: 'rgba(255, 255, 255, 0.40)',
  ctaBg: 'rgba(255, 255, 255, 0.10)',
  ctaBgPressed: 'rgba(255, 255, 255, 0.20)',
} as const;

/**
 * Pick a short status line based on how complete the profile is. Mirrors
 * the spec's "Great! Keep it up" copy and extends it for the lower bands so
 * the hero never feels stuck on a single phrase.
 */
function completionLine(pct: number): string {
  if (pct >= 100) return "You're all set";
  if (pct >= 70) return 'Great! Keep it up';
  if (pct >= 40) return 'Good progress';
  return "Let's get started";
}

/**
 * Profile Score hero card (design 04._dashboard_kse): indigo gradient with a
 * "Profile Score" label, tier-aware status, an "Improve Profile" pill, and a
 * cyan circular gauge on the right showing the live completion %.
 */
export function ProfileScoreHero() {
  const colors = useTheme();
  const profileQuery = useMyProfile();
  const skillIdsQuery = useMySkillIds();

  const profile = profileQuery.data;
  const completion =
    profile == null
      ? 0
      : profileCompletion(profile, (skillIdsQuery.data ?? []).length);

  const openProfile = () => router.push('/(tabs)/profile/edit');

  return (
    <View style={[styles.shadow, { boxShadow: `0px 6px 12px ${colors.primary}33` }]}>
      <LinearGradient
        colors={[colors.bannerFrom, colors.bannerVia, colors.bannerTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Decorative background discs (clipped by overflow). */}
        <View style={styles.glowPrimary} />
        <View style={styles.glowSecondary} />

        <View style={styles.copy}>
          <ThemedText style={styles.eyebrow}>Profile Score</ThemedText>
          <ThemedText themeColor="onPrimary" style={styles.status}>
            {completionLine(completion)}
          </ThemedText>
          <View style={styles.ctaWrap}>
            <Pressable
              onPress={openProfile}
              accessibilityRole="button"
              accessibilityLabel="Improve profile"
              style={({ pressed }) => [
                styles.cta,
                { borderColor: HERO_ART.ctaBorder, backgroundColor: HERO_ART.ctaBg },
                pressed && [styles.ctaPressed, { backgroundColor: HERO_ART.ctaBgPressed }],
              ]}
            >
              <ThemedText themeColor="onPrimary" style={styles.ctaLabel}>
                Improve Profile
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <ProgressRing
          progress={completion}
          size={84}
          strokeWidth={7}
          color={HERO_ART.ringFill}
          trackColor={HERO_ART.ringTrack}
        >
          <ThemedText themeColor="onPrimary" style={styles.ringLabel}>
            {completion}%
          </ThemedText>
        </ProgressRing>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 16,
    elevation: 5,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  glowPrimary: {
    position: 'absolute',
    right: -32,
    bottom: -32,
    width: 144,
    height: 144,
    borderRadius: 999,
    backgroundColor: HERO_ART.glowPrimary,
    pointerEvents: 'none',
  },
  glowSecondary: {
    position: 'absolute',
    left: -24,
    top: -24,
    width: 112,
    height: 112,
    borderRadius: 999,
    backgroundColor: HERO_ART.glowSecondary,
    pointerEvents: 'none',
  },
  copy: {
    maxWidth: 190,
    gap: 6,
  },
  eyebrow: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.4,
    color: '#E0E7FF', // indigo-100 — fixed on the indigo gradient
  },
  status: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  ctaWrap: {
    paddingTop: 6,
  },
  cta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  ctaPressed: {
    transform: [{ scale: 0.97 }],
  },
  ctaLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  ringLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
});
