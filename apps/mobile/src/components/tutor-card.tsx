import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TutorListItem } from '@kse/types';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'T';
}

function feeLabel(tutor: TutorListItem): string | null {
  if (tutor.expectedFeeMin == null && tutor.expectedFeeMax == null) return null;
  if (tutor.expectedFeeMax == null) return `From ৳${tutor.expectedFeeMin}`;
  if (tutor.expectedFeeMin == null) return `Up to ৳${tutor.expectedFeeMax}`;
  return `৳${tutor.expectedFeeMin}–${tutor.expectedFeeMax}/mo`;
}

interface TutorCardProps {
  tutor: TutorListItem;
}

/** Compact tutor row: initials avatar, name/headline, subjects, fee chip. */
export function TutorCard({ tutor }: TutorCardProps) {
  const colors = useTheme();

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/tuition/[id]',
      params: { id: tutor.id },
    });

  return (
    <Card onPress={open} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}1A` }]}>
          <ThemedText type="subtitle" style={{ color: colors.primary }}>
            {initialsOf(tutor.fullName)}
          </ThemedText>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            {tutor.isVerified && (
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={colors.success}
                accessibilityLabel="Verified tutor"
              />
            )}
            <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
              {tutor.fullName}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {tutor.headline}
          </ThemedText>
          {tutor.subjectNames.length > 0 && (
            <View style={styles.metaRow}>
              {tutor.subjectNames.slice(0, 3).map((subject) => (
                <Badge key={subject} label={subject} tone="primary" />
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.footRow}>
        {tutor.location && (
          <View style={styles.location}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {tutor.location}
            </ThemedText>
          </View>
        )}
        <TutorFeeBadge tutor={tutor} />
      </View>
    </Card>
  );
}

function TutorFeeBadge({ tutor }: TutorCardProps) {
  const fee = feeLabel(tutor);
  if (!fee) return null;
  return <Badge label={fee} tone="neutral" />;
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: 2,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
  },
});
