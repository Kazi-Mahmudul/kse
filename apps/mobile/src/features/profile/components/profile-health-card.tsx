import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressRing } from '@/components/ui/progress-ring';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  profileCompletion,
  profileCompletionChecks,
  type ProfileCompletionCheck,
} from '@/features/profile/completion';
import { useMyProfile, useMySkillIds } from '@/features/profile/queries';
import { useMyAchievements } from '@/features/portfolio/queries';
import { useSavedOpportunityIds } from '@/features/saved/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * Decorative palette for the gradient card. Lives here (not shared) because
 * each hero-style card picks its own ring colour; same rationale as
 * `features/dashboard/components/profile-score-hero.tsx`'s `HERO_ART`.
 */
const HEALTH_ART = {
  glowPrimary: 'rgba(59, 130, 246, 0.20)', // blue-400 / 20
  glowSecondary: 'rgba(165, 180, 252, 0.18)', // indigo-300 / 18
  ringTrack: 'rgba(255, 255, 255, 0.22)',
  ringFill: '#00E5FF',
  ctaBorder: 'rgba(255, 255, 255, 0.40)',
  ctaBg: 'rgba(255, 255, 255, 0.10)',
  ctaBgPressed: 'rgba(255, 255, 255, 0.20)',
} as const;

/**
 * Pick a short status line based on how complete the profile is. Mirrors
 * the dashboard's `completionLine()` so the two surfaces can't drift in
 * tone. Extended here to add the "100% — you're all set" upper band.
 */
function statusLine(pct: number): string {
  if (pct >= 100) return "You're all set";
  if (pct >= 70) return 'Great! Keep it up';
  if (pct >= 40) return 'Good progress';
  return "Let's get started";
}

/**
 * Derive the single most actionable missing item. Returns the label of the
 * first check where `done === false`, or "All set!" when everything passes.
 * The list comes from `profileCompletionChecks()` so the same source of
 * truth used by the Scholarship Hub surfaces here — the two can never
 * disagree about what counts as "complete".
 */
function nextMissingHint(checks: ProfileCompletionCheck[]): string {
  const next = checks.find((c) => !c.done);
  return next ? next.label : 'All set!';
}

/**
 * Profile Health card (design 05._profile_kse): the standout block on the
 * Profile tab. Indigo gradient with decorative glows, copy column on the
 * left ("Profile Health" eyebrow + tier-aware status + first-missing-field
 * hint), and a cyan `ProgressRing` gauge on the right showing the live
 * completion % with the Saved and Achievements counts tucked underneath.
 * A translucent "Improve Profile" pill at the bottom opens `/profile/edit`.
 * The whole card is also pressable to the same destination.
 */
export function ProfileHealthCard() {
  const colors = useTheme();
  const profileQuery = useMyProfile();
  const skillIdsQuery = useMySkillIds();
  const savedQuery = useSavedOpportunityIds();
  const achievementsQuery = useMyAchievements();

  const profile = profileQuery.data;
  const skillCount = skillIdsQuery.data?.length ?? 0;
  const savedCount = savedQuery.data?.size ?? 0;
  const achievementsCount = achievementsQuery.data?.length ?? 0;

  const completion = profile ? profileCompletion(profile, skillCount) : 0;
  const hint = profile ? nextMissingHint(profileCompletionChecks(profile, skillCount)) : '—';

  const openEdit = () => router.push('/(tabs)/profile/edit');

  return (
    <View style={[styles.shadow, { boxShadow: `0px 6px 14px ${colors.primary}33` }]}>
      <LinearGradient
        colors={[colors.bannerFrom, colors.bannerVia, colors.bannerTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.glowPrimary} pointerEvents="none" />
        <View style={styles.glowSecondary} pointerEvents="none" />

        <View style={styles.copy}>
          <ThemedText style={styles.eyebrow}>Profile Health</ThemedText>
          <ThemedText themeColor="onPrimary" style={styles.status}>
            {statusLine(completion)}
          </ThemedText>
          <ThemedText style={styles.hint} numberOfLines={1}>
            {hint}
          </ThemedText>

          <View style={styles.miniRow}>
            <MiniStat label="Saved" value={savedCount} />
            <View style={styles.miniDivider} />
            <MiniStat label="Achv." value={achievementsCount} />
          </View>
        </View>

        <View style={styles.ringWrap}>
          <ProgressRing
            progress={completion}
            size={92}
            strokeWidth={8}
            color={HEALTH_ART.ringFill}
            trackColor={HEALTH_ART.ringTrack}
          >
            <ThemedText themeColor="onPrimary" style={styles.ringLabel}>
              {completion}%
            </ThemedText>
          </ProgressRing>
        </View>

        {/* Pill CTA — pressable on its own (translucent border). */}
        <Pressable
          onPress={openEdit}
          accessibilityRole="button"
          accessibilityLabel="Improve profile"
          style={({ pressed }) => [
            styles.cta,
            { borderColor: HEALTH_ART.ctaBorder, backgroundColor: HEALTH_ART.ctaBg },
            pressed && [styles.ctaPressed, { backgroundColor: HEALTH_ART.ctaBgPressed }],
          ]}
        >
          <Ionicons name="create-outline" size={14} color="#FFFFFF" />
          <ThemedText themeColor="onPrimary" style={styles.ctaLabel}>
            Improve Profile
          </ThemedText>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.miniStat}>
      <ThemedText themeColor="onPrimary" style={styles.miniValue}>
        {value}
      </ThemedText>
      <ThemedText style={styles.miniLabel}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 20,
    elevation: 5,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three + 2,
    paddingBottom: Spacing.three + 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  glowPrimary: {
    position: 'absolute',
    right: -36,
    bottom: -36,
    width: 168,
    height: 168,
    borderRadius: 999,
    backgroundColor: HEALTH_ART.glowPrimary,
  },
  glowSecondary: {
    position: 'absolute',
    left: -28,
    top: -28,
    width: 124,
    height: 124,
    borderRadius: 999,
    backgroundColor: HEALTH_ART.glowSecondary,
  },
  copy: {
    flex: 1,
    gap: 2,
    paddingRight: Spacing.two,
  },
  eyebrow: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    color: '#E0E7FF', // indigo-100 — fixed on the indigo gradient
  },
  status: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  hint: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.78)',
    marginTop: 2,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  miniStat: {
    alignItems: 'flex-start',
    gap: 1,
  },
  miniValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  miniLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 10,
    lineHeight: 13,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  miniDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  cta: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
});
