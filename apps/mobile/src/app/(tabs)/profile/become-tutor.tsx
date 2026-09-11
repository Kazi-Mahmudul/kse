import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useForm } from 'react-hook-form';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import {
  useMyTutorApplication,
  useSubjects,
  useSubmitTutorApplication,
} from '@/features/tuition/queries';
import { useUniversities } from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import type { IconName } from '@/types/icon';
import type { MyTutorApplication } from '@kse/types';
import {
  tutorApplicationFormSchema,
  type TutorApplicationFormValues,
} from '@kse/validation';

function parseFee(value: string | undefined): number | null | 'invalid' {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 'invalid';
}

/**
 * Become a Tutor (profile → "Become a Tutor"): students submit their teaching
 * profile here; staff review it in the admin portal, and approval creates the
 * verified tutor listing. The screen reflects the application journey —
 * form → under review → verified / rejected (re-apply).
 */
export default function BecomeTutorScreen() {
  const colors = useTheme();
  const currentUserId = useAuthStore((s) => s.session?.user.id) ?? null;
  const applicationQuery = useMyTutorApplication();
  const [showForm, setShowForm] = useState(false);

  if (applicationQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <BackHeader title="Become a Tutor" />
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (applicationQuery.isError) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Become a Tutor" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load your application"
          message={(applicationQuery.error as Error).message}
          actionLabel="Try again"
          onAction={() => applicationQuery.refetch()}
        />
      </Screen>
    );
  }

  const application = applicationQuery.data;
  const canApply = !application || application.status === 'rejected' || showForm;

  return (
    <Screen>
      <BackHeader title="Become a Tutor" />

      {application?.status === 'pending' && (
        <StatusCard
          icon="time-outline"
          tone="warning"
          title="Application under review"
          body="Our team is verifying your tutor profile. You'll be listed on Tuition Finder once approved."
          application={application}
        />
      )}

      {application?.status === 'approved' && (
        <StatusCard
          icon="shield-checkmark-outline"
          tone="success"
          title="You're a verified tutor"
          body="Your profile is live on Tuition Finder. Keep your subjects and fee up to date."
          application={application}
          actionLabel="View tutor profile"
          onAction={() =>
            router.push({
              pathname: '/(tabs)/explore/tuition/[id]',
              // tutors.id is the auth user id (tutors ↔ auth.users 1:1).
              params: { id: currentUserId ?? '' },
            })
          }
        />
      )}

      {application?.status === 'rejected' && !showForm && (
        <StatusCard
          icon="close-circle-outline"
          tone="danger"
          title="Application not approved"
          body={application.reviewNote ?? 'Your application was not approved. You can apply again.'}
          application={application}
          actionLabel="Apply again"
          onAction={() => setShowForm(true)}
        />
      )}

      {canApply ? (
        <TutorApplicationForm
          prefill={application?.status === 'rejected' ? application : undefined}
        />
      ) : (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            What happens next? An admin verifies your identity, subjects and fee
            range. Approved tutors appear on Tuition Finder with a verified
            badge, and students can request tuition and leave reviews.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}

const STATUS_TONE = {
  warning: 'warning',
  success: 'success',
  danger: 'danger',
} as const;

function StatusCard({
  icon,
  tone,
  title,
  body,
  application,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  tone: 'warning' | 'success' | 'danger';
  title: string;
  body: string;
  application: MyTutorApplication;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useTheme();
  return (
    <Card tint={STATUS_TONE[tone]} style={styles.statusCard}>
      <View style={styles.statusHead}>
        <Ionicons name={icon} size={18} color={colors[tone]} />
        <ThemedText type="smallBold">{title}</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {body}
      </ThemedText>
      {application.subjectNames.length > 0 && (
        <View style={styles.statusChips}>
          {application.subjectNames.map((name) => (
            <Chip key={name} label={name} />
          ))}
        </View>
      )}
      {actionLabel && onAction && (
        <PrimaryButton
          label={actionLabel}
          variant="outline"
          size="compact"
          onPress={onAction}
        />
      )}
    </Card>
  );
}

function TutorApplicationForm({ prefill }: { prefill?: MyTutorApplication }) {
  const subjectsQuery = useSubjects();
  const universitiesQuery = useUniversities();
  const submitMutation = useSubmitTutorApplication();

  const [subjectIds, setSubjectIds] = useState<string[]>(prefill?.subjectIds ?? []);
  const [universityId, setUniversityId] = useState<string | null>(
    prefill?.universityId ?? null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<TutorApplicationFormValues>({
    resolver: zodResolver(tutorApplicationFormSchema),
    defaultValues: {
      headline: prefill?.headline ?? '',
      bio: prefill?.bio ?? '',
      location: prefill?.location ?? '',
      availability: prefill?.availability ?? '',
      expected_fee_min:
        prefill?.expectedFeeMin != null ? String(prefill.expectedFeeMin) : '',
      expected_fee_max:
        prefill?.expectedFeeMax != null ? String(prefill.expectedFeeMax) : '',
    },
  });

  const toggleSubject = (id: string) => {
    setSubjectIds((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    );
  };

  const onSubmit = handleSubmit((values) => {
    if (subjectIds.length === 0) {
      setFormError('Pick at least one subject');
      return;
    }
    const feeMin = parseFee(values.expected_fee_min);
    const feeMax = parseFee(values.expected_fee_max);
    if (feeMin === 'invalid' || feeMax === 'invalid') {
      setFormError('Fees must be whole numbers, e.g. 2500');
      return;
    }
    setFormError(null);
    submitMutation.mutate(
      {
        headline: values.headline,
        bio: values.bio.trim() || undefined,
        university_id: universityId,
        subject_ids: subjectIds,
        location: values.location.trim() || undefined,
        expected_fee_min: feeMin,
        expected_fee_max: feeMax,
        availability: values.availability.trim() || undefined,
      },
      {
        onError: (error: Error) => setFormError(error.message),
      },
    );
  });

  return (
    <View style={styles.form}>
      <TextField
        control={control}
        name="headline"
        label="Headline (required)"
        placeholder="e.g. CSE undergrad teaching programming fundamentals"
      />

      <View style={styles.chipBlock}>
        <ThemedText type="small" themeColor="textSecondary">
          Subjects ({subjectIds.length} selected)
        </ThemedText>
        <View style={styles.chipRow}>
          {subjectsQuery.data?.map((subject) => (
            <Chip
              key={subject.id}
              label={subject.name}
              selected={subjectIds.includes(subject.id)}
              onPress={() => toggleSubject(subject.id)}
            />
          ))}
        </View>
      </View>

      <SelectField
        label="University"
        value={universityId}
        options={(universitiesQuery.data ?? []).map((university) => ({
          value: university.id,
          label: university.short_name ?? university.name,
        }))}
        onSelect={setUniversityId}
        placeholder="Not listed"
      />

      <TextField
        control={control}
        name="location"
        label="Location (optional)"
        placeholder="e.g. Khulna (Sonadanga)"
      />

      <View style={styles.feeRow}>
        <View style={styles.feeField}>
          <TextField
            control={control}
            name="expected_fee_min"
            label="Fee from (৳/month)"
            placeholder="2000"
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.feeField}>
          <TextField
            control={control}
            name="expected_fee_max"
            label="Fee to (৳/month)"
            placeholder="3500"
            keyboardType="number-pad"
          />
        </View>
      </View>

      <TextField
        control={control}
        name="availability"
        label="Availability (optional)"
        placeholder="e.g. Evenings & weekends"
      />

      <TextField
        control={control}
        name="bio"
        label="About your tutoring (optional)"
        placeholder="Experience, teaching style, who you help…"
        multiline
        textAlignVertical="top"
      />

      <PrimaryButton
        label={submitMutation.isPending ? 'Submitting…' : 'Submit application'}
        loading={submitMutation.isPending}
        onPress={onSubmit}
      />

      {formError && (
        <Card tint="danger">
          <ThemedText type="small">{formError}</ThemedText>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    gap: Spacing.two,
  },
  statusHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  form: {
    gap: Spacing.three,
  },
  chipBlock: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  feeRow: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  feeField: {
    flex: 1,
  },
});
