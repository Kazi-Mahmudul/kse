import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { FontFamilies, Spacing } from '@/constants/theme';
import { TutorReviews } from '@/features/tuition/components/tutor-reviews';
import { useTutor } from '@/features/tuition/queries';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import type { IconName } from '@/types/icon';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'T';
}

function feeLabel(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (max == null) return `From ৳${min}`;
  if (min == null) return `Up to ৳${max}`;
  if (min === max) return `৳${min} / month`;
  return `৳${min}–${max} / month`;
}

/**
 * Tutor profile (design 10 style): white rounded-2xl hero card with avatar,
 * verified pill and rating summary, quick-facts card, about, and the review
 * workflow — plus the tuition request entry point.
 */
export default function TutorDetailScreen() {
  const colors = useTheme();
  const currentUserId = useAuthStore((s) => s.session?.user.id) ?? null;
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
        <BackHeader title="Tutor Profile" />
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Tutor Profile" />
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
  const university = tutor.universityShortName ?? tutor.universityName;
  const fee = feeLabel(tutor.expectedFeeMin, tutor.expectedFeeMax);

  return (
    <Screen style={{ backgroundColor: colors.surfaceMuted }}>
      <BackHeader title="Tutor Profile" />

      <View style={[styles.hero, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {tutor.avatarUrl ? (
          <Image
            source={{ uri: tutor.avatarUrl }}
            style={styles.heroAvatar}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={[styles.heroAvatar, styles.heroAvatarFallback, { backgroundColor: `${colors.primary}1A` }]}>
            <ThemedText type="title" style={{ color: colors.primary }}>
              {initialsOf(tutor.fullName)}
            </ThemedText>
          </View>
        )}

        <View style={styles.heroBody}>
          {tutor.isVerified && (
            <View style={[styles.verifiedPill, { backgroundColor: `${colors.success}1A` }]}>
              <Ionicons name="shield-checkmark" size={11} color={colors.success} />
              <ThemedText style={[styles.verifiedLabel, { color: colors.success }]}>
                Verified Tutor
              </ThemedText>
            </View>
          )}
          <ThemedText themeColor="heading" numberOfLines={2} style={styles.name}>
            {tutor.fullName}
          </ThemedText>
          {tutor.headline ? (
            <ThemedText themeColor="textSecondary" numberOfLines={2} style={styles.headline}>
              {tutor.headline}
            </ThemedText>
          ) : null}
          <StarRating
            value={tutor.ratingAvg}
            size={13}
            showValue
            count={tutor.ratingCount}
          />
        </View>
      </View>

      <View style={[styles.factsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {fee && <FactRow icon="cash-outline" label="Fee" value={fee} emphasized />}
        {university && <FactRow icon="school-outline" label="University" value={university} />}
        {tutor.location && <FactRow icon="location-outline" label="Location" value={tutor.location} />}
        {tutor.availability && <FactRow icon="time-outline" label="Availability" value={tutor.availability} />}
        {tutor.subjectNames.length > 0 && (
          <FactRow icon="book-outline" label="Subjects" value={tutor.subjectNames.join(' • ')} />
        )}
      </View>

      {tutor.bio && (
        <>
          <SectionHeader compact title="About" />
          <View style={[styles.aboutCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ThemedText themeColor="bodyStrong" style={styles.aboutText}>
              {tutor.bio}
            </ThemedText>
          </View>
        </>
      )}

      <SectionHeader compact title="Reviews" />
      <TutorReviews
        tutorId={tutor.id}
        ratingAvg={tutor.ratingAvg}
        ratingCount={tutor.ratingCount}
        currentUserId={currentUserId}
      />

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

function FactRow({
  icon,
  label,
  value,
  emphasized = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  const colors = useTheme();
  return (
    <View style={styles.factRow}>
      <View style={[styles.factIcon, { backgroundColor: `${colors.primary}1A` }]}>
        <Ionicons name={icon} size={13} color={colors.primary} />
      </View>
      <View style={styles.factText}>
        <ThemedText themeColor="textMuted" style={styles.factLabel}>
          {label}
        </ThemedText>
        <ThemedText
          themeColor={emphasized ? 'heading' : 'bodyStrong'}
          numberOfLines={2}
          style={emphasized ? styles.factValueEmphasized : styles.factValue}
        >
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  heroAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
    gap: 3,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    height: 22,
    borderRadius: 999,
    paddingHorizontal: 8,
  },
  verifiedLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 10,
    lineHeight: 13,
  },
  name: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  headline: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  factsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three - 4,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
  },
  factIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  factText: {
    flex: 1,
    gap: 1,
  },
  factLabel: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    lineHeight: 13,
  },
  factValue: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  factValueEmphasized: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 17,
  },
  aboutCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
  },
  aboutText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 20,
  },
});
