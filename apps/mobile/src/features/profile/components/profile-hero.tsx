import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useMyProfile } from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { ACADEMIC_LEVEL_LABELS } from '@kse/shared';

const BIO_MAX_CHARS = 140;
const BIO_MAX_LINES = 2;

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
 * Profile hero (design 05._profile_kse): tinted container with two soft
 * decorative discs, centred avatar, name, academic affiliation, optional
 * bio preview, location, and the Verified Student pill when applicable.
 *
 * Returns `null` while the profile query is pending so the rest of the
 * screen can render its loading state without a half-drawn hero.
 *
 * The bio preview is the first place `profile.bio` is rendered anywhere
 * in the mobile UI — it only shows up if the user has typed a bio. No
 * empty placeholder is rendered.
 */
export function ProfileHero() {
  const colors = useTheme();
  const tints = useTints();
  const profileQuery = useMyProfile();
  const profile = profileQuery.data;
  if (!profile) return null;

  const name = profile.full_name?.trim() || 'Student';
  const location = profile.university?.location ?? '—';
  const verified = tints.emerald;
  const bio = profile.bio?.trim() ?? '';
  const bioPreview =
    bio.length > BIO_MAX_CHARS ? `${bio.slice(0, BIO_MAX_CHARS).trimEnd()}…` : bio;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: tints.indigo.bg,
          borderColor: tints.indigo.border,
        },
      ]}
    >
      {/* Soft decorative discs — same pattern as the dashboard hero card. */}
      <View style={[styles.glowPrimary, { backgroundColor: tints.indigo.fg + '14' }]} />
      <View style={[styles.glowSecondary, { backgroundColor: tints.purple.fg + '14' }]} />

      <View style={styles.content}>
        <ProfileAvatar name={name} url={profile.avatar_url} size={80} ringSize={2} />

        <ThemedText themeColor="heading" style={styles.name} numberOfLines={1}>
          {name}
        </ThemedText>

        <ThemedText themeColor="textSecondary" style={styles.affiliation} numberOfLines={1}>
          {affiliationLine(profile)}
        </ThemedText>

        {bioPreview ? (
          <ThemedText
            themeColor="textSecondary"
            style={styles.bio}
            numberOfLines={BIO_MAX_LINES}
          >
            {bioPreview}
          </ThemedText>
        ) : null}

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <ThemedText themeColor="textMuted" style={styles.location} numberOfLines={1}>
            {location}
          </ThemedText>
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three + 4,
  },
  // Decorative blurred discs sit behind content; the parent uses overflow:
  // hidden so they never escape the rounded corner.
  glowPrimary: {
    position: 'absolute',
    right: -32,
    top: -32,
    width: 160,
    height: 160,
    borderRadius: 999,
    pointerEvents: 'none',
  },
  glowSecondary: {
    position: 'absolute',
    left: -28,
    bottom: -28,
    width: 120,
    height: 120,
    borderRadius: 999,
    pointerEvents: 'none',
  },
  content: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontFamily: FontFamilies.bold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
    marginTop: Spacing.three,
  },
  affiliation: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  bio: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.two,
  },
  location: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  verifiedLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
});
