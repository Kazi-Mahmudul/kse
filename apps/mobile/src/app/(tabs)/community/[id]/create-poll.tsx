import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useCommunity, useCreatePost } from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import { alertDialog } from '@/lib/confirm';
import {
  communityPollFormSchema,
  type CommunityPollFormValues,
} from '@kse/validation';
import type { CommunityPollResultVisibility } from '@kse/types';

const DURATIONS = [
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
];

const VISIBILITY_OPTIONS: { value: CommunityPollResultVisibility; label: string }[] = [
  { value: 'after_vote', label: 'After voting' },
  { value: 'after_close', label: 'After poll closes' },
  { value: 'realtime', label: 'Always visible' },
];

/**
 * Create poll (spec §Polls): question, 2–6 options, closing time and result
 * visibility. Submitted through the rate-limited Edge Function as a poll post.
 */
export default function CreateCommunityPollScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityQuery = useCommunity(id);
  const createPost = useCreatePost(id);

  // Question goes through RHF; options live in local state (useFieldArray +
  // zodResolver generics don't mix) and are validated by the same schema on
  // submit via communityPollFormSchema.
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Pick<CommunityPollFormValues, 'question'>>({
    resolver: zodResolver(communityPollFormSchema.pick({ question: true })),
    defaultValues: { question: '' },
  });
  const [options, setOptions] = useState<string[]>(['', '']);
  const [closesAt, setClosesAt] = useState<string | null>(null);
  const [resultVisibility, setResultVisibility] =
    useState<CommunityPollResultVisibility>('after_vote');
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const community = communityQuery.data;

  if (communityQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <BackHeader title="Create poll" />
      </Screen>
    );
  }
  if (communityQuery.isError || !community) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Create poll" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load community"
          message={(communityQuery.error as Error)?.message ?? 'Community not found'}
          actionLabel="Try again"
          onAction={() => communityQuery.refetch()}
        />
      </Screen>
    );
  }

  const setDuration = (hours: number | null) => {
    setClosesAt(hours == null ? null : new Date(Date.now() + hours * 3_600_000).toISOString());
  };
  const activeDuration = (() => {
    if (!closesAt) return null;
    const hours = (new Date(closesAt).getTime() - Date.now()) / 3_600_000;
    return DURATIONS.find((d) => Math.abs(d.hours - hours) < 1)?.label ?? null;
  })();

  const submit = handleSubmit(({ question }) => {
    const parsed = communityPollFormSchema.safeParse({
      question,
      options: options.map((o) => o.trim()).filter(Boolean),
      closesAt,
      resultVisibility,
    });
    if (!parsed.success) {
      setOptionsError(
        parsed.error.issues.find((issue) => issue.path[0] === 'options')?.message ?? null,
      );
      return;
    }
    setOptionsError(null);
    createPost.mutate(
      {
        communityId: id,
        postType: 'poll',
        content: parsed.data.question,
        poll: {
          options: parsed.data.options,
          closesAt: parsed.data.closesAt,
          resultVisibility: parsed.data.resultVisibility,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => {
          void alertDialog({ title: 'Could not create poll', message: error.message });
        },
      },
    );
  });

  return (
    <Screen>
      <BackHeader title={`Poll in ${community.name}`} />

      <Card tint="background" style={styles.formCard}>
        <TextField
          control={control}
          name="question"
          label="Question"
          placeholder="Ask members something…"
        />
        {errors.question && (
          <ThemedText type="small" themeColor="danger">
            {errors.question.message}
          </ThemedText>
        )}

        <View style={styles.optionsBlock}>
          <ThemedText type="smallBold">Options (2–6)</ThemedText>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                value={option}
                onChangeText={(text) =>
                  setOptions((current) => current.map((o, i) => (i === index ? text : o)))
                }
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.optionInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.background,
                  },
                ]}
              />
              {options.length > 2 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove option ${index + 1}`}
                  onPress={() => setOptions((current) => current.filter((_, i) => i !== index))}
                  style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                </Pressable>
              )}
            </View>
          ))}
          {optionsError && (
            <ThemedText type="small" themeColor="danger">
              {optionsError}
            </ThemedText>
          )}
          {options.length < 6 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOptions((current) => [...current, ''])}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <ThemedText type="small" themeColor="primary">
                Add option
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.durationBlock}>
          <ThemedText type="smallBold">Closes</ThemedText>
          <View style={styles.chipRow}>
            <Chip label="No deadline" selected={closesAt == null} onPress={() => setDuration(null)} />
            {DURATIONS.map((duration) => (
              <Chip
                key={duration.label}
                label={duration.label}
                selected={activeDuration === duration.label}
                onPress={() => setDuration(duration.hours)}
              />
            ))}
          </View>
        </View>

        <SelectField
          label="Results visible"
          value={resultVisibility}
          options={VISIBILITY_OPTIONS}
          onSelect={(value) =>
            setResultVisibility((value ?? 'after_vote') as CommunityPollResultVisibility)
          }
          clearable={false}
        />

        <PrimaryButton
          label={createPost.isPending ? 'Creating…' : 'Create poll'}
          loading={createPost.isPending}
          onPress={() => void submit()}
        />
        {createPost.isError && (
          <ThemedText type="small" themeColor="danger">
            {(createPost.error as Error).message}
          </ThemedText>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  formCard: {
    gap: Spacing.three - 4,
  },
  optionsBlock: {
    gap: Spacing.one + 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    fontFamily: FontFamilies.regular,
    fontSize: 13,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: 4,
  },
  durationBlock: {
    gap: Spacing.one + 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
