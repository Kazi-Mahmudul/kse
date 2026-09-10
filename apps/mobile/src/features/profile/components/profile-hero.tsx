import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { FontFamilies } from '@/constants/theme';
import { useMyProfile } from '@/features/profile/queries';
import { useTints } from '@/hooks/use-tints';
import { ACADEMIC_LEVEL_LABELS } from '@kse/shared';

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
  const tints = useTints();
  const profileQuery = useMyProfile();
  const profile = profileQuery.data;
  if (!profile) return null;

  const name = profile.full_name?.trim() || 'Student';
  const location = profile.university?.location ?? '—';
  const verified = tints.emerald;

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
            { backgroundColor: verified.bg, borderColor: verified.border },
          ]}
          accessibilityLabel="Verified student"
        >
          <Ionicons name="checkmark-circle" size={14} color={verified.fg} />
          <ThemedText style={[styles.verifiedLabel, { color: verified.fg }]}>
            Verified Student
          </ThemedText>
        </View>
      ) : null}
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
