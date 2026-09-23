import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useReport } from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import { alertDialog } from '@/lib/confirm';
import type { CommunityReportReason } from '@kse/types';

const REASONS: { value: CommunityReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'scam', label: 'Scam' },
  { value: 'misleading', label: 'Misleading' },
  { value: 'other', label: 'Other' },
];

/**
 * Report flow for posts, comments, events and communities (spec §Moderation).
 * Reasons mirror the DB-side zod enum; details are optional free text.
 */
export function ReportSheet({
  visible,
  targetType,
  targetId,
  onClose,
}: {
  visible: boolean;
  targetType: 'community' | 'community_post' | 'community_comment' | 'community_event' | 'community_poll';
  targetId: string;
  onClose: () => void;
}) {
  const colors = useTheme();
  const report = useReport();
  const [reason, setReason] = useState<CommunityReportReason | null>(null);
  const [details, setDetails] = useState('');

  const submit = () => {
    if (!reason) return;
    report.mutate(
      { targetType, targetId, reason, details: details.trim() || undefined },
      {
        onSuccess: () => {
          setReason(null);
          setDetails('');
          onClose();
          void alertDialog({
            title: 'Report submitted',
            message: 'Thank you — our moderators will review it shortly.',
          });
        },
        onError: (error) => {
          void alertDialog({ title: 'Could not report', message: error.message });
        },
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.heading}>
            <Ionicons name="flag-outline" size={18} color={colors.danger} />
            <ThemedText type="smallBold">Report content</ThemedText>
          </View>
          <View style={styles.chips}>
            {REASONS.map((r) => (
              <Chip
                key={r.value}
                label={r.label}
                selected={reason === r.value}
                onPress={() => setReason(r.value)}
              />
            ))}
          </View>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Add details (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[
              styles.details,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.backgroundElement,
              },
            ]}
          />
          <PrimaryButton
            label={report.isPending ? 'Sending…' : 'Submit report'}
            loading={report.isPending}
            disabled={!reason}
            onPress={submit}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    // colors.scrim applied via inline style below — see <Modal>
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    paddingTop: Spacing.one + 2,
    gap: Spacing.two + 2,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  details: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.two,
    minHeight: 72,
    textAlignVertical: 'top',
    fontFamily: FontFamilies.regular,
    fontSize: 13,
  },
});
