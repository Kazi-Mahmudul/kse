import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useMyResearchProfile,
  useMyResearchRequests,
  useRespondResearchRequest,
  useSaveMyResearchProfile,
} from '@/features/hub/queries';
import { alertDialog } from '@/lib/confirm';
import { useTheme } from '@/hooks/use-theme';
import { RESEARCH_COLLABORATION_LABELS } from '@kse/shared';
import { researchProfileFormSchema, type ResearchProfileFormValues } from '@kse/validation';
import { KHULNA_DIVISION_DISTRICTS, type ResearchCollaborationType, type ResearchProfileDetail } from '@kse/types';

const COLLABORATION_OPTIONS = (
  Object.keys(RESEARCH_COLLABORATION_LABELS) as ResearchCollaborationType[]
).map((value) => ({ value, label: RESEARCH_COLLABORATION_LABELS[value] }));

const DISTRICT_OPTIONS = KHULNA_DIVISION_DISTRICTS.map((value) => ({ value, label: value }));

type Section = 'profile' | 'requests';

/**
 * My research profile: create/edit the profile and manage incoming /
 * outgoing collaboration requests (spec student-hub §11).
 */
export default function MyResearchProfileScreen() {
  const [section, setSection] = useState<Section>('profile');

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="My research profile" />
      <SectionToggle section={section} onChange={setSection} />
      {section === 'profile' ? <MyProfileSection /> : <RequestsPanel />}
    </Screen>
  );
}

function SectionToggle({
  section,
  onChange,
}: {
  section: Section;
  onChange: (s: Section) => void;
}) {
  const colors = useTheme();
  return (
    <View style={[styles.toggleRow, { borderColor: colors.border }]}>
      {(['profile', 'requests'] as Section[]).map((s) => (
        <Pressable
          key={s}
          onPress={() => onChange(s)}
          accessibilityRole="button"
          accessibilityLabel={s === 'profile' ? 'Profile' : 'Requests'}
          style={[
            styles.toggle,
            section === s
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.backgroundElement },
          ]}
        >
          <ThemedText
            type="small"
            style={{
              color: section === s ? colors.onPrimary : colors.textSecondary,
              fontWeight: '700',
            }}
          >
            {s === 'profile' ? 'Profile' : 'Requests'}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

function MyProfileSection() {
  const colors = useTheme();
  const { data: existing, isPending, isError, error, refetch } = useMyResearchProfile();

  if (isPending) {
    return (
      <ThemedText type="small" style={{ color: colors.textSecondary }}>
        Loading…
      </ThemedText>
    );
  }
  if (isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Could not load your profile"
        message={(error as Error).message}
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }

  // key remounts the form once the existing profile resolves.
  return <ProfileForm key={existing?.id ?? 'new'} existing={existing} />;
}

function ProfileForm({ existing }: { existing: ResearchProfileDetail | null }) {
  const colors = useTheme();
  const save = useSaveMyResearchProfile();
  const [skillsText, setSkillsText] = useState(existing?.skills.join(', ') ?? '');

  // The parent remounts this form (key=profile id) when the existing profile
  // loads, so defaultValues below are correct without effect-time resets.
  const { control, handleSubmit, setValue } = useForm<ResearchProfileFormValues>({
    resolver: zodResolver(researchProfileFormSchema),
    defaultValues: {
      research_interest: existing?.research_interest ?? '',
      discipline: existing?.discipline ?? '',
      topic: existing?.topic ?? '',
      skills: existing?.skills ?? [],
      collaboration_type: existing?.collaboration_type ?? 'any',
      institution: existing?.institution ?? '',
      district: existing?.district ?? '',
      availability: existing?.availability ?? '',
      bio: existing?.bio ?? '',
    },
  });

  const syncSkills = (text: string) => {
    setSkillsText(text);
    const skills = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setValue('skills', skills, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: ResearchProfileFormValues) => {
    try {
      await save.mutateAsync({
        research_interest: values.research_interest,
        discipline: values.discipline || undefined,
        topic: values.topic || undefined,
        skills: values.skills,
        collaboration_type: values.collaboration_type,
        institution: values.institution || undefined,
        district: values.district || undefined,
        availability: values.availability || undefined,
        bio: values.bio || undefined,
      });
      void alertDialog({
        title: 'Saved',
        message: 'Your research profile is live in Research Partners.',
      });
    } catch (err) {
      void alertDialog({
        title: 'Could not save',
        message: err instanceof Error ? err.message : 'Try again.',
      });
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.form}>
      {existing ? (
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Editing your public research profile.
        </ThemedText>
      ) : (
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Create a profile so students across Khulna Division can find you as a research partner.
        </ThemedText>
      )}

      <TextField
        control={control}
        name="research_interest"
        label="Research interest *"
        placeholder="e.g. Computer Vision"
      />
      <TextField
        control={control}
        name="discipline"
        label="Discipline"
        placeholder="e.g. Computer Science & Engineering"
      />
      <TextField
        control={control}
        name="topic"
        label="Research topic"
        placeholder="What are you working on?"
      />

      <View style={styles.fieldGroup}>
        <ThemedText type="smallBold">Skills * (comma separated)</ThemedText>
        <Controller
          control={control}
          name="skills"
          render={() => (
            <View
              style={[
                styles.skillsInput,
                { borderColor: colors.border, backgroundColor: colors.backgroundElement },
              ]}
            >
              <TextInput
                value={skillsText}
                onChangeText={syncSkills}
                placeholder="Python, Machine Learning, OpenCV"
                placeholderTextColor={colors.textMuted}
                style={{ color: colors.text, fontFamily: FontFamilies.regular, fontSize: 13 }}
              />
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="collaboration_type"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="Looking for *"
            value={value}
            options={COLLABORATION_OPTIONS}
            onSelect={onChange}
          />
        )}
      />
      <TextField
        control={control}
        name="institution"
        label="University / Institution"
        placeholder="e.g. KUET"
      />
      <Controller
        control={control}
        name="district"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="District"
            value={value ?? ''}
            options={DISTRICT_OPTIONS}
            onSelect={onChange}
          />
        )}
      />
      <TextField
        control={control}
        name="availability"
        label="Availability"
        placeholder="e.g. Evenings & weekends"
      />
      <TextField
        control={control}
        name="bio"
        label="Short introduction"
        placeholder="A couple of sentences about your research goals"
        multiline
      />

      <PrimaryButton
        label={existing ? 'Save profile' : 'Create profile'}
        onPress={handleSubmit(onSubmit)}
        loading={save.isPending}
      />
    </ScrollView>
  );
}

function RequestsPanel() {
  const colors = useTheme();
  const { data, isPending, isError, error, refetch } = useMyResearchRequests();
  const respond = useRespondResearchRequest();

  if (isPending) {
    return (
      <ThemedText type="small" style={{ color: colors.textSecondary }}>
        Loading…
      </ThemedText>
    );
  }
  if (isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Could not load requests"
        message={(error as Error).message}
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }

  const { received, sent } = data ?? { received: [], sent: [] };

  if (received.length === 0 && sent.length === 0) {
    return (
      <EmptyState
        icon="mail-outline"
        title="No requests yet"
        message="When students find your profile and reach out, requests will appear here."
      />
    );
  }

  const respondTo = (requestId: string, accept: boolean) => {
    respond.mutate(
      { requestId, accept },
      {
        onError: (err) => {
          void alertDialog({ title: 'Could not respond', message: err.message });
        },
      },
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: Spacing.three }}>
      {received.length > 0 ? (
        <View style={{ gap: Spacing.two + 2 }}>
          <ThemedText type="default" style={{ fontWeight: '700' }}>
            Received
          </ThemedText>
          {received.map((request) => (
            <View
              key={request.id}
              style={[styles.requestCard, { borderColor: colors.border }]}
            >
              <View style={styles.requestHead}>
                <Ionicons name="person-outline" size={15} color={colors.textSecondary} />
                <ThemedText type="small" style={{ color: colors.textSecondary, flex: 1 }}>
                  {request.from_profile?.full_name ?? 'A student'} ·{' '}
                  {new Date(request.created_at).toLocaleDateString('en-GB')}
                </ThemedText>
                <StatusPill status={request.status} />
              </View>
              <ThemedText type="small">{request.message}</ThemedText>
              {request.status === 'pending' ? (
                <View style={styles.requestActions}>
                  <PrimaryButton
                    label="Accept"
                    size="compact"
                    loading={respond.isPending}
                    onPress={() => respondTo(request.id, true)}
                  />
                  <PrimaryButton
                    label="Decline"
                    variant="outline"
                    size="compact"
                    onPress={() => respondTo(request.id, false)}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {sent.length > 0 ? (
        <View style={{ gap: Spacing.two + 2 }}>
          <ThemedText type="default" style={{ fontWeight: '700' }}>
            Sent
          </ThemedText>
          {sent.map((request) => (
            <View
              key={request.id}
              style={[styles.requestCard, { borderColor: colors.border }]}
            >
              <View style={styles.requestHead}>
                <ThemedText type="small" style={{ color: colors.textSecondary, flex: 1 }}>
                  {new Date(request.created_at).toLocaleDateString('en-GB')}
                </ThemedText>
                <StatusPill status={request.status} />
              </View>
              <ThemedText type="small">{request.message}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatusPill({ status }: { status: 'pending' | 'accepted' | 'declined' }) {
  const colors = useTheme();
  const tone =
    status === 'accepted'
      ? { bg: `${colors.success}22`, fg: colors.success }
      : status === 'declined'
        ? { bg: `${colors.danger}22`, fg: colors.danger }
        : { bg: `${colors.warning}33`, fg: colors.warning };
  return (
    <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
      <ThemedText
        type="small"
        style={{ color: tone.fg, fontWeight: '700', textTransform: 'capitalize' }}
      >
        {status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
    gap: 3,
    marginBottom: Spacing.three,
  },
  toggle: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.one + 2,
    borderRadius: 9,
  },
  form: {
    gap: Spacing.two + 2,
    paddingBottom: Spacing.five,
  },
  fieldGroup: {
    gap: Spacing.one + 2,
  },
  skillsInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.two,
  },
  requestCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.one + 2,
  },
  requestHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
});
