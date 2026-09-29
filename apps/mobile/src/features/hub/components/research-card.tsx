import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RESEARCH_COLLABORATION_LABELS } from '@kse/shared';
import type { ResearchProfileSummary } from '@kse/types';

/** Research partner card — profile style (spec student-hub §32). */
export function ResearchCard({ profile }: { profile: ResearchProfileSummary }) {
  const colors = useTheme();

  const open = () =>
    router.push({ pathname: '/hub/research/[id]', params: { id: profile.id } });

  return (
    <Pressable
      onPress={open}
      android_ripple={{ color: colors.shadow }}
      accessibilityRole="button"
      accessibilityLabel={`Research profile: ${profile.research_interest}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.headRow}>
        <ProfileAvatar
          url={profile.profile?.avatar_url ?? null}
          name={profile.profile?.full_name ?? 'Student'}
          size={44}
        />
        <View style={styles.headBody}>
          <Text style={[styles.name, { color: colors.heading ?? colors.text }]} numberOfLines={1}>
            {profile.profile?.full_name ?? 'Student'}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {profile.institution ?? profile.discipline ?? 'Independent researcher'}
          </Text>
        </View>
      </View>

      <Text style={[styles.interest, { color: colors.bodyStrong ?? colors.text }]} numberOfLines={2}>
        {profile.research_interest}
      </Text>
      {profile.topic ? (
        <Text style={[styles.topic, { color: colors.textSecondary }]} numberOfLines={2}>
          {profile.topic}
        </Text>
      ) : null}

      {profile.skills.length > 0 ? (
        <View style={styles.skillRow}>
          {profile.skills.slice(0, 3).map((skill) => (
            <View key={skill} style={[styles.skill, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.skillText, { color: colors.textSecondary }]} numberOfLines={1}>
                {skill}
              </Text>
            </View>
          ))}
          {profile.skills.length > 3 ? (
            <Text style={[styles.more, { color: colors.textMuted }]}>
              +{profile.skills.length - 3}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footRow}>
        <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
        <Text style={[styles.foot, { color: colors.textSecondary }]} numberOfLines={1}>
          {RESEARCH_COLLABORATION_LABELS[profile.collaboration_type]}
          {profile.district ? ` · ${profile.district}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    padding: Spacing.three,
    gap: Spacing.one + 2,
    overflow: 'hidden',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
  },
  interest: {
    fontSize: 13,
    fontWeight: '600',
  },
  topic: {
    fontSize: 12,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  skill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  more: {
    fontSize: 10,
    fontWeight: '600',
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  foot: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
});
