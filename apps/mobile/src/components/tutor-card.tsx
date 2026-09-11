import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TutorListItem } from '@kse/types';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'T';
}

function feeParts(tutor: TutorListItem): { amount: string; suffix: string } | null {
  const { expectedFeeMin: min, expectedFeeMax: max } = tutor;
  if (min == null && max == null) return null;
  if (max == null) return { amount: `From ৳${min}`, suffix: '' };
  if (min == null) return { amount: `Up to ৳${max}`, suffix: '' };
  if (min === max) return { amount: `৳${min}`, suffix: '/month' };
  return { amount: `৳${min}–${max}`, suffix: '/month' };
}

interface TutorCardProps {
  tutor: TutorListItem;
  /** Bookmark state from the saved-tutors list (design: card's right column). */
  saved?: boolean;
  onToggleSave?: (tutorId: string) => void;
}

/**
 * Tutor row (design 10._tuition_finder_kse_2): white rounded-2xl card —
 * rounded-square avatar, name / subjects / university stack, bold ৳ fee with
 * "/month" suffix, star rating + bookmark in the right column.
 *
 * The card is a plain View with sibling Pressables (content vs bookmark):
 * react-native-web renders a button-role Pressable as a real `<button>`, and
 * HTML forbids `<button>` inside `<button>`.
 */
export function TutorCard({ tutor, saved = false, onToggleSave }: TutorCardProps) {
  const colors = useTheme();
  const fee = feeParts(tutor);
  const university = tutor.universityShortName ?? tutor.universityName;

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/tuition/[id]',
      params: { id: tutor.id },
    });

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${tutor.fullName}, ${tutor.subjectNames.join(', ')}`}
        style={({ pressed }) => [styles.left, pressed && styles.pressed]}
      >
        {tutor.avatarUrl ? (
          <Image
            source={{ uri: tutor.avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: `${colors.primary}1A` }]}>
            <ThemedText type="smallBold" style={{ color: colors.primary }}>
              {initialsOf(tutor.fullName)}
            </ThemedText>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            {tutor.isVerified && (
              <Ionicons
                name="shield-checkmark"
                size={13}
                color={colors.success}
                accessibilityLabel="Verified tutor"
              />
            )}
            <ThemedText themeColor="heading" numberOfLines={1} style={styles.title}>
              {tutor.fullName}
            </ThemedText>
          </View>
          {tutor.subjectNames.length > 0 && (
            <ThemedText themeColor="textSecondary" numberOfLines={1} style={styles.subjects}>
              {tutor.subjectNames.slice(0, 3).join(' • ')}
            </ThemedText>
          )}
          {university && (
            <ThemedText themeColor="textMuted" numberOfLines={1} style={styles.university}>
              {university}
            </ThemedText>
          )}
          {fee && (
            <ThemedText themeColor="heading" style={styles.fee}>
              {fee.amount}
              {fee.suffix && (
                <ThemedText themeColor="textSecondary" style={styles.feeSuffix}>
                  {fee.suffix}
                </ThemedText>
              )}
            </ThemedText>
          )}
        </View>
      </Pressable>

      <View style={styles.right}>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color={colors.warning} />
          <ThemedText themeColor="bodyStrong" style={styles.ratingValue}>
            {tutor.ratingCount > 0 ? tutor.ratingAvg.toFixed(1) : 'New'}
          </ThemedText>
        </View>
        {onToggleSave && (
          <Pressable
            onPress={() => onToggleSave(tutor.id)}
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${tutor.fullName} from saved` : `Save ${tutor.fullName}`}
            hitSlop={6}
            style={({ pressed }) => [styles.bookmark, pressed && styles.pressed]}
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={saved ? colors.primary : colors.textMuted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three - 4,
    // shadow-[0_2px_8px_rgba(0,0,0,0.03)]
    boxShadow: '0px 2px 4px rgba(15, 23, 42, 0.03)',
    elevation: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  subjects: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },
  university: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    lineHeight: 13,
  },
  fee: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  feeSuffix: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    lineHeight: 13,
  },
  right: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingVertical: 2,
    marginLeft: Spacing.two,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  bookmark: {
    padding: 2,
  },
});
