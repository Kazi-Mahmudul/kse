import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { MyProfile } from '@/features/profile/service';
import {
  useMyProfile,
  useMySkillIds,
  useSaveProfile,
  useSkills,
  useUniversities,
  useDepartments,
} from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';
import { ACADEMIC_LEVEL_OPTIONS } from '@kse/shared';
import {
  formToUpdatePayload,
  profileFormSchema,
  type ProfileFormValues,
} from '@kse/validation';

/** Edit form for student-editable profile fields (spec §6). */
export default function ProfileEditScreen() {
  const colors = useTheme();
  const profileQuery = useMyProfile();
  const skillIdsQuery = useMySkillIds();
  const universitiesQuery = useUniversities();
  const departmentsQuery = useDepartments();
  const skillsQuery = useSkills();
  const saveMutation = useSaveProfile();

  if (profileQuery.isPending || skillIdsQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (profileQuery.isError) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Edit profile" />
        <ThemedText type="small" themeColor="textSecondary">
          {(profileQuery.error as Error).message}
        </ThemedText>
      </Screen>
    );
  }

  return (
    <ProfileEditForm
      profile={profileQuery.data}
      initialSkillIds={skillIdsQuery.data ?? []}
      universities={universitiesQuery.data ?? []}
      departments={departmentsQuery.data ?? []}
      skills={skillsQuery.data ?? []}
      skillsLoading={skillsQuery.isPending}
      saveMutation={saveMutation}
    />
  );
}

interface ProfileEditFormProps {
  profile: MyProfile;
  initialSkillIds: string[];
  universities: { id: string; name: string; short_name: string | null }[];
  departments: { id: string; university_id: string; name: string }[];
  skills: { id: string; name: string }[];
  skillsLoading: boolean;
  saveMutation: ReturnType<typeof useSaveProfile>;
}

/**
 * Mounted only once queries resolve, so form defaults and skill selection
 * initialize from data on mount — no state-syncing effects.
 */
function ProfileEditForm({
  profile,
  initialSkillIds,
  universities,
  departments,
  skills,
  skillsLoading,
  saveMutation,
}: ProfileEditFormProps) {
  const colors = useTheme();
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialSkillIds);
  const [interestDraft, setInterestDraft] = useState('');

  const { control, handleSubmit, setValue, setError, clearErrors, formState } =
    useForm<ProfileFormValues>({
      resolver: zodResolver(profileFormSchema),
      defaultValues: {
        full_name: profile.full_name ?? '',
        bio: profile.bio ?? '',
        phone: profile.phone ?? '',
        university_id: profile.university_id,
        department_id: profile.department_id,
        academic_level: profile.academic_level,
        interests: profile.interests ?? [],
      },
    });

  const universityId = useWatch({ control, name: 'university_id' });
  const departmentValue = useWatch({ control, name: 'department_id' });
  const academicLevel = useWatch({ control, name: 'academic_level' });
  const interests = useWatch({ control, name: 'interests' }) ?? [];

  // Departments are scoped to the selected university.
  const scopedDepartments = departments.filter(
    (d) => !universityId || d.university_id === universityId,
  );

  const selectUniversity = (value: string | null) => {
    setValue('university_id', value, { shouldDirty: true });
    const stillValid =
      departmentValue &&
      departments.some((d) => d.id === departmentValue && (!value || d.university_id === value));
    if (!stillValid) setValue('department_id', null, { shouldDirty: true });
  };

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const addInterest = () => {
    const name = interestDraft.trim().toLowerCase();
    if (!name) return;
    if (interests.includes(name) || interests.length >= 20) return;
    setValue('interests', [...interests, name], { shouldDirty: true });
    setInterestDraft('');
  };

  const removeInterest = (name: string) => {
    setValue(
      'interests',
      interests.filter((i) => i !== name),
      { shouldDirty: true },
    );
  };

  const onSubmit = handleSubmit((values) => {
    clearErrors('root');
    saveMutation.mutate(
      { profile: formToUpdatePayload(values), skillIds: selectedSkills },
      {
        onSuccess: () => router.back(),
        onError: (error) => {
          setError('root', { message: (error as Error).message });
        },
      },
    );
  });

  return (
    <Screen>
      <BackHeader title="Edit profile" />

      {formState.errors.root?.message && (
        <ThemedText type="small" style={{ color: colors.danger }}>
          {formState.errors.root.message}
        </ThemedText>
      )}

      <TextField
        control={control}
        name="full_name"
        label="Full name"
        autoCapitalize="words"
        textContentType="name"
      />
      <TextField
        control={control}
        name="bio"
        label="Bio"
        multiline
        placeholder="A short introduction (max 500 characters)"
      />
      <TextField
        control={control}
        name="phone"
        label="Phone (optional)"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />

      <SelectField
        label="University"
        value={universityId}
        options={universities.map((u) => ({ value: u.id, label: u.short_name ?? u.name }))}
        onSelect={selectUniversity}
      />
      <SelectField
        label="Department"
        value={departmentValue}
        options={scopedDepartments.map((d) => ({ value: d.id, label: d.name }))}
        onSelect={(value) => setValue('department_id', value, { shouldDirty: true })}
      />
      <SelectField
        label="Academic level"
        value={academicLevel}
        options={ACADEMIC_LEVEL_OPTIONS}
        onSelect={(value) =>
          setValue('academic_level', value as ProfileFormValues['academic_level'], {
            shouldDirty: true,
          })
        }
      />

      <View style={styles.section}>
        <ThemedText type="smallBold">Skills</ThemedText>
        {skillsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={styles.chips}>
            {skills.map((skill) => (
              <Chip
                key={skill.id}
                label={skill.name}
                selected={selectedSkills.includes(skill.id)}
                onPress={() => toggleSkill(skill.id)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold">Interests</ThemedText>
        <View style={styles.interestRow}>
          <InterestInput
            value={interestDraft}
            onChangeText={setInterestDraft}
            onSubmit={addInterest}
          />
          <PrimaryButton label="Add" onPress={addInterest} style={styles.interestAdd} />
        </View>
        {interests.length > 0 && (
          <View style={styles.chips}>
            {interests.map((interest) => (
              <Pressable key={interest} onPress={() => removeInterest(interest)}>
                <Chip label={`${interest}  ✕`} selected />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <PrimaryButton
        label="Save changes"
        loading={saveMutation.isPending}
        onPress={onSubmit}
      />
    </Screen>
  );
}

function BackHeader({ title }: { title: string }) {
  const colors = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <ThemedText type="subtitle">{title}</ThemedText>
    </View>
  );
}

function InterestInput({
  value,
  onChangeText,
  onSubmit,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}) {
  const colors = useTheme();
  return (
    <View style={[styles.interestInputWrap, { backgroundColor: colors.backgroundElement }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="e.g. web development"
        placeholderTextColor={colors.textSecondary}
        style={[styles.interestInput, { color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  back: {
    padding: Spacing.one,
    marginLeft: -Spacing.one + 2,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  interestRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  interestInputWrap: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    height: 46,
  },
  interestInput: {
    fontSize: 15,
    paddingVertical: 0,
  },
  interestAdd: {
    paddingHorizontal: Spacing.four,
    minHeight: 46,
  },
});
