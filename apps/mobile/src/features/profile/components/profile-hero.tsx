import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { FontFamilies } from '@/constants/theme';
import { useMyProfile } from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';
import { ACADEMIC_LEVEL_LABELS } from '@kse/shared';

/** Verified-pill colours are fixed on purpose (matches `promo-banner.tsx`'s
 *  HERO_ART rationale): the emerald identity is a brand signal, not chrome. */
const VERIFIED = {
  bg: '#ECFDF5', // emerald-50
  border: '#A7F3D0', // emerald-200
  fg: '#059669', // emerald-600
} as const;

/**
 * Single-line academic affiliation: "CSE, Khulna University • Level 3, Term 1"
 * Falls back through university.short_name → university.name → "University",
 * and "—" for the level when undeclared, so the row never collapses to
 * `undefined` text.
 */
function affiliationLine(profile: {
  department: { name: string } | null;
  university: { name: string; short_name: string | null } | null;
  academic_level: string | null;
}): string {
  const dept = profile.department?.name ?? 'Department';
  const uni = profile.university?.short_name ?? profile.university?.name ?? 'University';
  const level = profile.academic_level ? ACADEMIC_LEVEL_LABELS[profile.academic_level as keyof typeof ACADEMIC_LEVEL_LABELS] : '—';
  return `${dept}, ${uni} • ${level}`;
}

/**
 * Profile hero (design 05._profile_kse): centred avatar with gradient ring,
 * name, academic-affiliation line, location line, optional Verified Student
 * pill. Returns `null` while the profile query is pending so the rest of the
 * screen can render its loading state without a half-drawn hero.
 */
export function ProfileHero() {
  const colors = useTheme();
  const profileQuery = useMyProfile();
  const profile = profileQuery.data;
  if (!profile) return null;

  const name = profile.full_name?.trim() || 'Student';
  const location = profile.university?.location ?? '—';

  return (
    <View style={styles.wrap}>
      <ProfileAvatar name={name} url={profile.avatar_url} size={80} ringSize={2} />

      <ThemedText themeColor="heading" style={styles.name} numberOfLines={1}>
        {name}
      </ThemedText>

      <ThemedText themeColor="textSecondary" style={styles.affiliation} numberOfLines={1}>
        {affiliationLine(profile)}
      </ThemedText>

      <ThemedText themeColor="textMuted" style={styles.location} numberOfLines={1}>
        {location}
      </ThemedText>

      {profile.is_verified ? (
        <View
          style={[
            styles.verifiedPill,
            { backgroundColor: VERIFIED.bg, borderColor: VERIFIED.border },
          ]}
          accessibilityLabel="Verified student"
        >
          <Ionicons name="checkmark-circle" size={14} color={VERIFIED.fg} />
          <ThemedText style={[styles.verifiedLabel, { color: VERIFIED.fg }]}>
            Verified Student
          </ThemedText>
        </View>
      ) : null}
      {/* `colors` is consumed by `useTheme` for the hero's themed chrome above;
          keep the binding so a future theme-aware swap doesn't silently lose it. */}
      {void colors}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  name: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    marginTop: 12,
  },
  affiliation: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  location: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  verifiedLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
});
