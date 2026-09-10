import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, useWatch } from 'react-hook-form';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FontFamilies, Spacing } from '@/constants/theme';
import { AvatarPicker } from '@/features/profile/components/avatar-picker';
import type { MyProfile } from '@/features/profile/service';
import {
  useMyProfile,
  useMySkillIds,
  useRemoveAvatar,
  useSaveProfile,
  useSkills,
  useUniversities,
  useDepartments,
  useUploadAvatar,
} from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';
import { ACADEMIC_LEVEL_OPTIONS } from '@kse/shared';
import {
  formToUpdatePayload,
  profileFormSchema,
  type ProfileFormValues,
} from '@kse/validation';

/**
 * Coerces empty / undefined to null for RHF's `defaultValues`. The pickers
 * use `null` as the "unset" sentinel, but the API can return either.
 */
function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value.trim() === '' ? null : value;
}

/**
 * Edit profile: centred hero with avatar picker, then sectioned cards
 * (Personal / University / Skills / Interests) and a sticky Save CTA at
 * the bottom of the safe area (outside the ScrollView so it never scrolls
 * out of reach). Mirrors the visual language of the Profile tab.
 */
export default function ProfileEditScreen() {
  const colors = useTheme();
  const profileQuery = useMyProfile();
  const skillIdsQuery = useMySkillIds();
  const universitiesQuery = useUniversities();
  const departmentsQuery = useDepartments();
  const skillsQuery = useSkills();
  const saveMutation = useSaveProfile();
  const uploadMutation = useUploadAvatar();
  const removeAvatarMutation = useRemoveAvatar();

  if (profileQuery.isPending || skillIdsQuery.isPending) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={[styles.flex, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (profileQuery.isError) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <BackHeader title="Edit profile" />
        <ThemedText type="small" themeColor="textSecondary" style={styles.errorPad}>
          {(profileQuery.error as Error).message}
        </ThemedText>
      </SafeAreaView>
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
      uploadMutation={uploadMutation}
      removeAvatarMutation={removeAvatarMutation}
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
  uploadMutation: ReturnType<typeof useUploadAvatar>;
  removeAvatarMutation: ReturnType<typeof useRemoveAvatar>;
}

/**
 * Form mount. Skill selection lives outside RHF (matching the prior
 * implementation) because the `user_skills` join is diffed separately by
 * `setMySkills()`. Interests live in RHF as an array field.
 *
 * `shouldDirty: true` is set explicitly on every `setValue` call so the
 * `formState.isDirty` flag flips the moment the user makes a change —
 * the previous version relied on the resolver to detect dirtiness and that
 * silently failed for array fields like `interests`.
 */
function ProfileEditForm({
  profile,
  initialSkillIds,
  universities,
  departments,
  skills,
  skillsLoading,
  saveMutation,
  uploadMutation,
  removeAvatarMutation,
}: ProfileEditFormProps) {
  const colors = useTheme();
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialSkillIds);
  const [interestDraft, setInterestDraft] = useState('');
  const [saved, setSaved] = useState(false);

  const { control, handleSubmit, setValue, setError, clearErrors, formState, reset } =
    useForm<ProfileFormValues>({
      resolver: zodResolver(profileFormSchema),
      defaultValues: {
        full_name: profile.full_name ?? '',
        bio: profile.bio ?? '',
        phone: profile.phone ?? '',
        // Defensive coercion: RHF defaults must be `null`, never `undefined`
        // or `''`, so the resolver sees a value of type `string | null`.
        // Anything else gets a clear "Invalid selection" error instead of
        // an opaque `invalid input syntax for type uuid` from Postgres.
        university_id: emptyToNull(profile.university_id),
        department_id: emptyToNull(profile.department_id),
        academic_level: profile.academic_level ?? null,
        interests: profile.interests ?? [],
      },
    });

  const universityId = useWatch({ control, name: 'university_id' });
  const departmentValue = useWatch({ control, name: 'department_id' });
  const academicLevel = useWatch({ control, name: 'academic_level' });
  const interests = useWatch({ control, name: 'interests' }) ?? [];
  const fullName = useWatch({ control, name: 'full_name' });

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

  // RHF's resolver swallows validation errors silently. Surface the first
  // one as a top-level banner so the user knows why Save "didn't work".
  const onSubmit = handleSubmit(
    (values) => {
      Keyboard.dismiss();
      clearErrors('root');
      saveMutation.mutate(
        { profile: formToUpdatePayload(values), skillIds: selectedSkills },
        {
          onSuccess: () => {
            // Sync the form's `defaultValues` to what we just persisted so
            // `formState.isDirty` flips back to false and the button disables
            // again until the next change.
            reset(values);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          },
          onError: (error) => {
            setError('root', { message: (error as Error).message });
          },
        },
      );
    },
    (errors) => {
      const first = Object.values(errors)[0];
      const message = (first?.message as string | undefined) ?? 'Please fix the highlighted fields.';
      setError('root', { message });
    },
  );

  const skillById = new Map(skills.map((s) => [s.id, s]));
  const selectedSkillsRendered = selectedSkills
    .map((id) => skillById.get(id))
    .filter((s): s is { id: string; name: string } => Boolean(s));
  const availableSkills = skills.filter((s) => !selectedSkills.includes(s.id));

  // Dirty = RHF says any field is dirty OR the user added/removed a skill.
  const dirty =
    formState.isDirty ||
    selectedSkills.length !== initialSkillIds.length ||
    (selectedSkills.length > 0 &&
      initialSkillIds.length > 0 &&
      selectedSkills.some((id) => !initialSkillIds.includes(id)));

  const submitting = saveMutation.isPending || uploadMutation.isPending;
  const submitDisabled = !dirty || submitting;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Sticky header */}
        <BackHeader title="Edit profile" />

        {/* Top-level error banner — visible whenever a submit failed validation
            or the server rejected the payload. */}
        {formState.errors.root?.message ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.danger + '22', borderColor: colors.danger },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <ThemedText type="small" style={{ color: colors.danger, flex: 1 }}>
              {formState.errors.root.message}
            </ThemedText>
            <Pressable
              onPress={() => clearErrors('root')}
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
            >
              <Ionicons name="close" size={16} color={colors.danger} />
            </Pressable>
          </View>
        ) : null}

        {/* Scrollable body */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <AvatarPicker
            url={profile.avatar_url}
            name={fullName?.trim() || 'Student'}
            uploading={uploadMutation.isPending || removeAvatarMutation.isPending}
            onPicked={(payload: { localUri: string; mimeType: string }) => {
              const { localUri, mimeType } = payload;
              uploadMutation.mutate(
                { localUri, mimeType },
                {
                  onError: (error) =>
                    setError('root', { message: (error as Error).message }),
                },
              );
            }}
            onRemove={() => {
              removeAvatarMutation.mutate(undefined, {
                onError: (error) =>
                  setError('root', { message: (error as Error).message }),
              });
            }}
          />

          {/* Personal information */}
          <ThemedText type="smallBold" style={styles.section}>
            Personal information
          </ThemedText>
          <Card>
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
          </Card>

          {/* University */}
          <ThemedText type="smallBold" style={styles.section}>
            University
          </ThemedText>
          <Card>
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
          </Card>

          {/* Skills */}
          <ThemedText type="smallBold" style={styles.section}>
            Skills ({selectedSkills.length})
          </ThemedText>
          <Card>
            {skillsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                {selectedSkillsRendered.length > 0 ? (
                  <View style={styles.chips}>
                    {selectedSkillsRendered.map((skill) => (
                      <Pressable
                        key={skill.id}
                        onPress={() => toggleSkill(skill.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${skill.name}`}
                        style={styles.chipRow}
                      >
                        <Chip label={skill.name} selected />
                        <Ionicons
                          name="close"
                          size={14}
                          color={colors.onPrimary}
                          style={styles.chipClose}
                        />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textMuted">
                    No skills selected yet.
                  </ThemedText>
                )}

                {availableSkills.length > 0 ? (
                  <>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.subLabel}
                    >
                      Add skills
                    </ThemedText>
                    <View style={styles.chips}>
                      {availableSkills.map((skill) => (
                        <Chip
                          key={skill.id}
                          label={skill.name}
                          onPress={() => toggleSkill(skill.id)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            )}
          </Card>

          {/* Interests */}
          <ThemedText type="smallBold" style={styles.section}>
            Interests ({interests.length} / 20)
          </ThemedText>
          <Card>
            <View style={styles.interestRow}>
              <InterestInput
                value={interestDraft}
                onChangeText={setInterestDraft}
                onSubmit={addInterest}
              />
              <PrimaryButton
                label="Add"
                size="compact"
                onPress={addInterest}
                disabled={!interestDraft.trim()}
              />
            </View>
            {interests.length > 0 ? (
              <View style={styles.chips}>
                {interests.map((interest) => (
                  <Pressable
                    key={interest}
                    onPress={() => removeInterest(interest)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${interest}`}
                  >
                    <Chip label={`${interest}  ✕`} selected />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>

          {saved ? (
            <View style={styles.success}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <ThemedText type="small" style={{ color: colors.success }}>
                Saved
              </ThemedText>
            </View>
          ) : null}

          {/* Bottom spacer so the sticky CTA doesn't cover the last card */}
          <View style={{ height: Spacing.five }} />
        </ScrollView>

        {/* Sticky Save CTA — sits above the keyboard via KeyboardAvoidingView */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <PrimaryButton
            label={saved ? 'Saved ✓' : 'Save changes'}
            loading={submitting}
            disabled={submitDisabled}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
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
        hitSlop={8}
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
    <View
      style={[styles.interestInputWrap, { backgroundColor: colors.backgroundElement }]}
    >
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
  flex: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorPad: {
    padding: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  back: {
    padding: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  section: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    overflow: 'hidden',
  },
  chipClose: {
    marginLeft: -Spacing.two,
    marginRight: Spacing.two,
  },
  subLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  interestRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  interestInputWrap: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    height: 44,
  },
  interestInput: {
    fontSize: 15,
    paddingVertical: 0,
  },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    alignSelf: 'flex-start',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
