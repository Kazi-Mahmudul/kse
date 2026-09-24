import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { alertDialog } from '@/lib/confirm';
import { blurActiveElement } from '@/lib/focus';
import {
  SCHOLARSHIP_APPLICATION_STATUS_LABELS,
  SCHOLARSHIP_APPLICATION_STATUS_OPTIONS,
} from '@kse/shared';
import type { ScholarshipApplicationStatus } from '@kse/types';

import { useUpsertApplication } from './queries';

interface AddToTrackerSheetProps {
  visible: boolean;
  opportunityId: string | null;
  opportunityTitle?: string;
  initialStatus?: ScholarshipApplicationStatus;
  initialNotes?: string;
  onClose(): void;
}

/**
 * Bottom-sheet that adds/updates a scholarship_applications row for the
 * student. Used from the scholarship detail page; opening with an
 * existing status pre-fills the picker so updating is one tap.
 */
export function AddToTrackerSheet({
  visible,
  opportunityId,
  opportunityTitle,
  initialStatus = 'interested',
  initialNotes,
  onClose,
}: AddToTrackerSheetProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const upsert = useUpsertApplication();
  const [status, setStatus] = useState<ScholarshipApplicationStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? '');

  // Reset the picker every time the sheet re-opens so users see the
  // current tracked status (or the default "interested" if first add).
  const [lastVisible, setLastVisible] = useState(visible);
  if (visible && !lastVisible) {
    setStatus(initialStatus);
    setNotes(initialNotes ?? '');
  }
  if (visible !== lastVisible) {
    setLastVisible(visible);
  }

  const canSubmit = useMemo(() => opportunityId != null, [opportunityId]);

  const handleSubmit = async () => {
    if (!opportunityId) return;
    try {
      await upsert.mutateAsync({
        opportunity_id: opportunityId,
        status,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      onClose();
      void alertDialog({
        title: 'Tracker updated',
        message: `Marked as "${SCHOLARSHIP_APPLICATION_STATUS_LABELS[status]}".`,
      });
    } catch (error) {
      await alertDialog({
        title: 'Could not update',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
        onPress={onClose}
      >
        <ThemedView
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <View style={styles.headerRow}>
              <View style={styles.headerTitle}>
                <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
                <ThemedText type="smallBold">Application tracker</ThemedText>
              </View>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>

          {opportunityTitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {opportunityTitle}
            </ThemedText>
          ) : null}

          <View style={styles.body}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
            <View style={styles.statusGrid}>
              {SCHOLARSHIP_APPLICATION_STATUS_OPTIONS.map((option) => {
                const selected = status === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      blurActiveElement();
                      setStatus(option.value);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    style={({ pressed }) => [
                      styles.statusOption,
                      {
                        backgroundColor: selected ? colors.primary : colors.backgroundElement,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: selected ? '#fff' : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.two }]}>
              Notes (optional)
            </Text>
            <NotesField
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. waiting on recommendation letter"
            />
          </View>

          <View style={styles.submitRow}>
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.submitButton}
            />
            <PrimaryButton
              label={upsert.isPending ? 'Saving…' : 'Save'}
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={upsert.isPending}
              style={styles.submitButton}
            />
          </View>

          {upsert.isPending ? (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
        </ThemedView>
      </Pressable>
    </Modal>
  );
}

function NotesField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  const colors = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      multiline
      style={[
        styles.notes,
        {
          backgroundColor: colors.backgroundElement,
          color: colors.text,
          borderColor: colors.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxHeight: '85%',
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  body: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusOption: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  notes: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Spacing.two,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  submitRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  submitButton: {
    flex: 1,
  },
  savingRow: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
