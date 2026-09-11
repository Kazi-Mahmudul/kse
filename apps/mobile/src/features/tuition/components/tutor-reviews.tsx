import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useDeleteTutorReview,
  useTutorReviews,
  useUpsertTutorReview,
} from '@/features/tuition/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/dates';
import { blurActiveElement } from '@/lib/focus';
import type { TutorReview } from '@kse/types';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'S';
}

interface TutorReviewsProps {
  tutorId: string;
  /** Aggregate from the tutor row (trigger-maintained). */
  ratingAvg: number;
  ratingCount: number;
  /** Signed-in student; the tutor themself cannot review their own profile. */
  currentUserId: string | null | undefined;
}

/**
 * Reviews block on the tutor profile (design 10 style): star summary, review
 * cards, and a bottom-sheet write/edit form. RLS mirrors the buttons — the
 * reviewer edits/removes their own review; the tutor may remove any review on
 * their profile; staff moderate from the admin portal.
 */
export function TutorReviews({
  tutorId,
  ratingAvg,
  ratingCount,
  currentUserId,
}: TutorReviewsProps) {
  const colors = useTheme();
  const reviewsQuery = useTutorReviews(tutorId);
  const upsert = useUpsertTutorReview(tutorId);
  const remove = useDeleteTutorReview(tutorId);

  /** Sheet state is initialised when opening — prefilled when editing. */
  const [sheet, setSheet] = useState<{
    open: boolean;
    rating: number;
    comment: string;
    editing: boolean;
  }>({ open: false, rating: 0, comment: '', editing: false });
  const [error, setError] = useState<string | null>(null);

  const reviews = reviewsQuery.data ?? [];
  const myReview = reviews.find((review) => review.reviewerId === currentUserId);
  const isOwnProfile = currentUserId === tutorId;

  const openSheet = () => {
    // Drop the trigger's focus before the sheet mounts (see blurActiveElement).
    blurActiveElement();
    setError(null);
    setSheet({
      open: true,
      rating: myReview?.rating ?? 0,
      comment: myReview?.comment ?? '',
      editing: Boolean(myReview),
    });
  };

  const submit = () => {
    if (sheet.rating < 1) {
      setError('Pick a star rating');
      return;
    }
    upsert.mutate(
      { rating: sheet.rating, comment: sheet.comment.trim() || undefined },
      {
        onSuccess: () => setSheet((current) => ({ ...current, open: false })),
        onError: (err: Error) => setError(err.message),
      },
    );
  };

  const confirmDelete = (reviewId: string) => {
    remove.mutate(reviewId);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryLeft}>
          <Ionicons name="star" size={13} color={colors.warning} />
          <ThemedText themeColor="bodyStrong" style={styles.summaryValue}>
            {ratingCount > 0 ? ratingAvg.toFixed(1) : 'New'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.summaryMeta}>
            {ratingCount > 0
              ? `· ${ratingCount} ${ratingCount === 1 ? 'review' : 'reviews'}`
              : 'No reviews yet'}
          </ThemedText>
        </View>
        {!isOwnProfile && (
          <Pressable
            onPress={openSheet}
            accessibilityRole="button"
            accessibilityLabel={myReview ? 'Edit your review' : 'Write a review'}
            style={({ pressed }) => [
              styles.writeButton,
              { backgroundColor: `${colors.primary}1A` },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={myReview ? 'create-outline' : 'add'}
              size={14}
              color={colors.primary}
            />
            <ThemedText themeColor="primary" style={styles.writeLabel}>
              {myReview ? 'Edit review' : 'Write a review'}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {reviewsQuery.isPending && (
        <ActivityIndicator size="small" color={colors.primary} />
      )}

      {reviewsQuery.isError && (
        <ThemedText themeColor="textSecondary" style={styles.errorText}>
          Could not load reviews. {(reviewsQuery.error as Error).message}
        </ThemedText>
      )}

      {reviewsQuery.isSuccess && reviews.length === 0 && (
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          {isOwnProfile
            ? 'Reviews from your students will appear here.'
            : 'No reviews yet — be the first to share your experience.'}
        </ThemedText>
      )}

      <View style={styles.list}>
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            canEdit={review.reviewerId === currentUserId}
            canDelete={
              review.reviewerId === currentUserId || tutorId === currentUserId
            }
            deleting={remove.isPending && remove.variables === review.id}
            onDelete={() => confirmDelete(review.id)}
            onEdit={openSheet}
          />
        ))}
      </View>

      <Modal
        visible={sheet.open}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSheet((current) => ({ ...current, open: false }))
        }
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
          onPress={() => setSheet((current) => ({ ...current, open: false }))}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              {sheet.editing ? 'Edit your review' : 'Review this tutor'}
            </ThemedText>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Rating</Text>
            <StarRating
              value={sheet.rating}
              interactive
              onChange={(rating) => setSheet((current) => ({ ...current, rating }))}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Comment</Text>
            <TextInput
              value={sheet.comment}
              onChangeText={(comment) => setSheet((current) => ({ ...current, comment }))}
              placeholder="How was the tutoring experience?"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[
                styles.commentInput,
                {
                  backgroundColor: colors.backgroundElement,
                  color: colors.text,
                },
              ]}
            />

            {error && (
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            )}

            <Pressable
              onPress={submit}
              disabled={upsert.isPending}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: colors.primary },
                (upsert.isPending || pressed) && styles.buttonMuted,
              ]}
            >
              <ThemedText themeColor="onPrimary" style={styles.submitLabel}>
                {upsert.isPending ? 'Saving…' : 'Submit review'}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ReviewCard({
  review,
  canEdit,
  canDelete,
  deleting,
  onDelete,
  onEdit,
}: {
  review: TutorReview;
  canEdit: boolean;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const colors = useTheme();

  return (
    <View
      style={[styles.reviewCard, { backgroundColor: colors.background, borderColor: colors.border }]}
    >
      <View style={styles.reviewHead}>
        <View style={[styles.reviewerAvatar, { backgroundColor: `${colors.primary}1A` }]}>
          <ThemedText style={[styles.reviewerInitials, { color: colors.primary }]}>
            {initialsOf(review.reviewerName)}
          </ThemedText>
        </View>
        <View style={styles.reviewerMeta}>
          <ThemedText themeColor="heading" numberOfLines={1} style={styles.reviewerName}>
            {review.reviewerName}
          </ThemedText>
          <View style={styles.reviewSub}>
            <StarRating value={review.rating} size={11} />
            <ThemedText themeColor="textMuted" style={styles.reviewDate}>
              {formatDate(review.createdAt)}
            </ThemedText>
          </View>
        </View>
        {(canEdit || canDelete) && (
          <View style={styles.reviewActions}>
            {canEdit && (
              <Pressable
                onPress={onEdit}
                accessibilityRole="button"
                accessibilityLabel="Edit your review"
                hitSlop={6}
              >
                <Ionicons name="create-outline" size={15} color={colors.textMuted} />
              </Pressable>
            )}
            {canDelete && (
              <Pressable
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete review"
                hitSlop={6}
              >
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={deleting ? colors.textMuted : colors.danger}
                />
              </Pressable>
            )}
          </View>
        )}
      </View>
      {review.comment && (
        <ThemedText themeColor="bodyStrong" style={styles.reviewComment}>
          {review.comment}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three - 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  summaryValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  summaryMeta: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  writeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    borderRadius: 999,
    paddingHorizontal: Spacing.three - 4,
  },
  writeLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 11,
    lineHeight: 14,
  },
  list: {
    gap: Spacing.three - 4,
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three - 4,
    gap: Spacing.two,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  reviewerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerInitials: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 11,
    lineHeight: 14,
  },
  reviewerMeta: {
    flex: 1,
    gap: 1,
  },
  reviewerName: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 15,
  },
  reviewSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  reviewDate: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    lineHeight: 13,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  reviewComment: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  errorText: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three - 4,
  },
  sheetTitle: {
    marginBottom: Spacing.one,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: Spacing.one,
  },
  commentInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  submitButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  submitLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
  },
  buttonMuted: {
    opacity: 0.75,
  },
  pressed: {
    opacity: 0.7,
  },
});
