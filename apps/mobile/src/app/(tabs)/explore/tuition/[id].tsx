import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTutor } from '@/features/tuition/queries';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/hooks/use-theme';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'T';
}

function feeLabel(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (max == null) return `From ৳${min}`;
  if (min == null) return `Up to ৳${max}`;
  return `৳${min}–${max} / month`;
}

/** Tutor profile (step 15): subjects, fee, availability + request entry point. */
export default function TutorDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useTutor(id);

  // Step 19 analytics: track tutor view (per spec §20).
  useEffect(() => {
    if (query.data?.id) {
      analytics.tutorViewed(query.data.id);
    }
  }, [query.data?.id]);

  if (query.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <BackHeader title="Tutor" />
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Tutor" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load this tutor"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      </Screen>
    );
  }

  const tutor = query.data;

  return (
    <Screen>
      <BackHeader title="Tutor" />

      <View style={styles.headingRow}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}1A` }]}>
          <ThemedText type="title" style={{ color: colors.primary }}>
            {initialsOf(tutor.fullName)}
          </ThemedText>
        </View>
        <View style={styles.heading}>
          <View style={styles.badges}>
            {tutor.isVerified && <Badge label="Verified" tone="success" />}
          </View>
          <ThemedText type="subtitle">{tutor.fullName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {tutor.headline}
          </ThemedText>
        </View>
      </View>

      <SectionHeader title="Details" />
      <Card style={styles.detailsCard}>
        {tutor.subjectNames.length > 0 && (
          <DetailRow icon="book-outline" label="Subjects">
            <View style={styles.tagRow}>
              {tutor.subjectNames.map((subject) => (
                <Chip key={subject} label={subject} />
              ))}
            </View>
          </DetailRow>
        )}
        {tutor.universityName && (
          <DetailRow icon="school-outline" label="University" value={tutor.universityName} />
        )}
        {tutor.location && (
          <DetailRow icon="location-outline" label="Location" value={tutor.location} />
        )}
        {feeLabel(tutor.expectedFeeMin, tutor.expectedFeeMax) && (
          <DetailRow
            icon="cash-outline"
            label="Expected fee"
            value={feeLabel(tutor.expectedFeeMin, tutor.expectedFeeMax)!}
          />
        )}
        {tutor.availability && (
          <DetailRow
            icon="time-outline"
            label="Availability"
            value={tutor.availability}
          />
        )}
      </Card>

      {tutor.bio && (
        <>
          <SectionHeader title="About" />
          <Card>
            <ThemedText type="small">{tutor.bio}</ThemedText>
          </Card>
        </>
      )}

      <PrimaryButton
        label="Request tuition"
        onPress={() =>
          router.push({
            pathname: '/(tabs)/tuition-request',
            params: { tutorId: tutor.id, tutorName: tutor.fullName },
          })
        }
      />
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  value,
  children,
}: {
  icon: 'book-outline' | 'school-outline' | 'location-outline' | 'cash-outline' | 'time-outline';
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  const colors = useTheme();
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <View style={styles.detailText}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        {children ?? (
          <ThemedText type="smallBold" numberOfLines={2}>
            {value}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    flex: 1,
    gap: 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  detailsCard: {
    gap: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  detailText: {
    flex: 1,
    gap: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
});
