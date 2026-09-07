import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm } from 'react-hook-form';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useCreateTuitionRequest, useSubjects } from '@/features/tuition/queries';
import { useTheme } from '@/hooks/use-theme';
import {
  tuitionRequestFormSchema,
  type TuitionRequestFormValues,
} from '@kse/validation';

/**
 * Tuition request form (step 15): a student contacts one tutor (from their
 * profile) or posts an open request for a subject. Contact only — no payments.
 */
export default function TuitionRequestScreen() {
  const params = useLocalSearchParams<{
    tutorId?: string;
    tutorName?: string;
    subjectId?: string;
    subjectName?: string;
  }>();

  if (!params.tutorId && !params.subjectId) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Request tuition" />
        <EmptyState
          icon="book-outline"
          title="Choose a tutor or subject first"
          message="Open a tutor profile or pick a subject from Tuition & Tutors, then request tuition from there."
          actionLabel="Browse tutors"
          onAction={() => router.push('/(tabs)/explore/tuition')}
        />
      </Screen>
    );
  }

  return (
    <TuitionRequestForm
      key={`${params.tutorId ?? ''}-${params.subjectId ?? ''}`}
      {...params}
    />
  );
}

function TuitionRequestForm({
  tutorId,
  tutorName,
  subjectId: initialSubjectId,
  subjectName,
}: {
  tutorId?: string;
  tutorName?: string;
  subjectId?: string;
  subjectName?: string;
}) {
  const colors = useTheme();
  const [subjectId, setSubjectId] = useState<string | undefined>(initialSubjectId);
  const subjectsQuery = useSubjects();
  const createMutation = useCreateTuitionRequest();

  const { control, handleSubmit } = useForm<TuitionRequestFormValues>({
    resolver: zodResolver(tuitionRequestFormSchema),
    defaultValues: { message: '', preferred_time: '' },
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(
      {
        tutor_id: tutorId ?? null,
        subject_id: subjectId ?? null,
        message: values.message,
        preferred_time: values.preferred_time.trim() || null,
      },
      {
        onSuccess: () => router.replace('/(tabs)/tuition-requests'),
      },
    );
  });

  return (
    <Screen>
      <BackHeader title="Request tuition" />

      <Card tint="backgroundElement">
        <View style={styles.targetRow}>
          <Ionicons
            name={tutorId ? 'person-circle-outline' : 'book-outline'}
            size={20}
            color={colors.primary}
          />
          <View style={styles.targetText}>
            <ThemedText type="small" themeColor="textSecondary">
              {tutorId ? 'Tutor' : 'Subject'}
            </ThemedText>
            <ThemedText type="smallBold" numberOfLines={1}>
              {tutorId
                ? tutorName ?? 'Selected tutor'
                : subjectName ?? 'Selected subject'}
            </ThemedText>
          </View>
        </View>
      </Card>

      {!initialSubjectId && subjectsQuery.data && (
        <View style={styles.chipBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            Subject (optional)
          </ThemedText>
          <View style={styles.chipRow}>
            <Chip
              label="No subject"
              selected={!subjectId}
              onPress={() => setSubjectId(undefined)}
            />
            {subjectsQuery.data.map((subject) => (
              <Chip
                key={subject.id}
                label={subject.name}
                selected={subjectId === subject.id}
                onPress={() =>
                  setSubjectId((current) =>
                    current === subject.id ? undefined : subject.id,
                  )
                }
              />
            ))}
          </View>
        </View>
      )}

      <TextField
        control={control}
        name="message"
        label="Message (required)"
        placeholder="What do you need help with? Mention your class and timeline…"
        multiline
        textAlignVertical="top"
      />

      <TextField
        control={control}
        name="preferred_time"
        label="Preferred time (optional)"
        placeholder="e.g. Weekday evenings"
        autoCapitalize="none"
      />

      <PrimaryButton
        label={createMutation.isPending ? 'Sending…' : 'Send request'}
        loading={createMutation.isPending}
        onPress={onSubmit}
      />

      {createMutation.isError && (
        <Card tint="danger">
          <ThemedText type="small">{(createMutation.error as Error).message}</ThemedText>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  targetText: {
    flex: 1,
    gap: 2,
  },
  chipBlock: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
});
