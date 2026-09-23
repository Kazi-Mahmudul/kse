import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useCommunity, useCreateEvent } from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import { alertDialog } from '@/lib/confirm';
import {
  communityEventFormSchema,
  type CommunityEventFormValues,
} from '@kse/validation';
import type { CommunityEventMode } from '@kse/types';

/**
 * Create event (spec §Events) — moderators/owners only (RLS-enforced).
 * Date-times are entered as "YYYY-MM-DD HH:mm" local-time strings; the zod
 * schema + DB CHECKs reject invalid ranges.
 */
export default function CreateCommunityEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const communityQuery = useCommunity(id);
  const createEvent = useCreateEvent(id);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CommunityEventFormValues>({
    resolver: zodResolver(communityEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
      mode: 'offline',
      location: '',
      meetingUrl: '',
      organizer: '',
    },
  });
  const mode = watch('mode');
  const community = communityQuery.data;

  if (communityQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <BackHeader title="Create event" />
      </Screen>
    );
  }
  if (communityQuery.isError || !community) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Create event" />
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

  const submit = handleSubmit((values) => {
    const startsDate = new Date(values.startsAt.replace(' ', 'T'));
    if (Number.isNaN(startsDate.getTime())) {
      void alertDialog({
        title: 'Invalid start time',
        message: 'Use the format YYYY-MM-DD HH:mm, e.g. 2026-10-05 16:00.',
      });
      return;
    }
    const endsDate = values.endsAt ? new Date(values.endsAt.replace(' ', 'T')) : null;
    if (endsDate && Number.isNaN(endsDate.getTime())) {
      void alertDialog({
        title: 'Invalid end time',
        message: 'Use the format YYYY-MM-DD HH:mm, e.g. 2026-10-05 18:00.',
      });
      return;
    }
    const startsAtIso = startsDate.toISOString();
    const endsAtIso = endsDate ? endsDate.toISOString() : null;
    createEvent.mutate(
      {
        communityId: id,
        title: values.title,
        description: values.description.trim() || null,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        mode: values.mode,
        location: values.location.trim() || null,
        meetingUrl: values.meetingUrl.trim() || null,
        organizer: values.organizer.trim() || null,
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => {
          void alertDialog({ title: 'Could not create event', message: error.message });
        },
      },
    );
  });

  return (
    <Screen>
      <BackHeader title={`Event in ${community.name}`} />

      <Card tint="background" style={styles.formCard}>
        <TextField control={control} name="title" label="Title" placeholder="Meetup title" />
        {errors.title && (
          <ThemedText type="small" themeColor="danger">
            {errors.title.message}
          </ThemedText>
        )}

        <SegmentedControl
          options={[
            { value: 'offline' as const, label: 'On campus' },
            { value: 'online' as const, label: 'Online' },
            { value: 'hybrid' as const, label: 'Hybrid' },
          ]}
          value={mode}
          onChange={(value) => setValue('mode', value as CommunityEventMode, { shouldValidate: true })}
        />

        {mode !== 'online' && (
          <TextField
            control={control}
            name="location"
            label="Location"
            placeholder="e.g. CSE Seminar Room 201"
          />
        )}
        {mode !== 'offline' && (
          <>
            <TextField
              control={control}
              name="meetingUrl"
              label="Meeting link"
              placeholder="https://meet.google.com/…"
              autoCapitalize="none"
              keyboardType="url"
            />
            {errors.meetingUrl && (
              <ThemedText type="small" themeColor="danger">
                {errors.meetingUrl.message}
              </ThemedText>
            )}
          </>
        )}

        <TextField
          control={control}
          name="startsAt"
          label="Starts (YYYY-MM-DD HH:mm)"
          placeholder="2026-10-05 16:00"
          autoCapitalize="none"
        />
        {errors.startsAt && (
          <ThemedText type="small" themeColor="danger">
            {errors.startsAt.message}
          </ThemedText>
        )}
        <TextField
          control={control}
          name="endsAt"
          label="Ends (optional, YYYY-MM-DD HH:mm)"
          placeholder="2026-10-05 18:00"
          autoCapitalize="none"
        />
        {errors.endsAt && (
          <ThemedText type="small" themeColor="danger">
            {errors.endsAt.message}
          </ThemedText>
        )}

        <TextField
          control={control}
          name="description"
          label="Description"
          placeholder="What is this event about?"
          multiline
          textAlignVertical="top"
        />
        <TextField
          control={control}
          name="organizer"
          label="Organizer (optional)"
          placeholder={community.name}
        />

        <PrimaryButton
          label={createEvent.isPending ? 'Creating…' : 'Create event'}
          loading={createEvent.isPending}
          onPress={() => void submit()}
        />
        {createEvent.isError && (
          <ThemedText type="small" themeColor="danger">
            {(createEvent.error as Error).message}
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
    gap: Spacing.two,
  },
});
