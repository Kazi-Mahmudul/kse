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
  useUploadAvatar,
} from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import {
  formToUpdatePayload,
  profileFormSchema,
  type ProfileFormValues,
} from '@kse/validation';

/**
 * Edit profile: centred hero with avatar picker, then sectioned cards
 * (Personal / Skills / Interests) and a sticky Save CTA at the bottom of
 * the safe area (outside the ScrollView so it never scrolls out of
 * reach). Mirrors the visual language of the Profile tab.
 *
 * University / department / academic level used to live here but moved
 * to Portfolio → Education, so they're no longer in this form. A
 * prominent Portfolio callout card below the avatar points the user to
 * the right place to add those (plus projects, certificates, etc.).
 */
export default function ProfileEditScreen() {
  const colors = useTheme();
  const profileQuery = useMyProfile();
  const skillIdsQuery = useMySkillIds();
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
  skills,
  skillsLoading,
  saveMutation,
  uploadMutation,
  removeAvatarMutation,
}: ProfileEditFormProps) {
  const colors = useTheme();
  const tints = useTints();
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
        interests: profile.interests ?? [],
      },
    });

  const interests = useWatch({ control, name: 'interests' }) ?? [];
  const fullName = useWatch({ control, name: 'full_name' });

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

          {/* Portfolio shortcut — the highlight of this page. Replaces the
           * old in-page University section; university details are now
           * added inside Portfolio → Education (richer surface). */}
          <PortfolioCallout
            palette={tints.indigo}
            onPress={() => router.push('/(tabs)/portfolio')}
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
                      <SelectedSkillChip
                        key={skill.id}
                        label={skill.name}
                        onRemove={() => toggleSkill(skill.id)}
                      />
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
                  <SelectedSkillChip
                    key={interest}
                    label={interest}
                    onRemove={() => removeInterest(interest)}
                  />
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

/**
 * Pill-shaped removable chip used for selected skills and interests.
 *
 * A real Pressable that owns its own pill background, label, and close
 * icon — no nested Chip + negative-margin hack. The previous layout
 * glued a separate close icon onto a `<Chip selected>` with
 * `marginLeft: -Spacing.two`, which clipped the icon and put it half on
 * top of the pill. Now the close button sits inside its own circular
 * hit-target on the right, with a visible divider gap from the label.
 */
function SelectedSkillChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.selectedChip,
        { backgroundColor: colors.primary },
      ]}
    >
      <ThemedText style={[styles.selectedChipLabel, { color: colors.onPrimary }]} numberOfLines={1}>
        {label}
      </ThemedText>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
        style={({ pressed }) => [
          styles.selectedChipClose,
          { backgroundColor: pressed ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)' },
        ]}
      >
        <Ionicons name="close" size={14} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

/**
 * The highlight of this page — a tinted card that points users to the
 * Portfolio, where they manage university, projects, certificates,
 * achievements, research, resumes, and links. Sits right under the
 * avatar so the connection between "what's on this page" and "what's in
 * the portfolio" is obvious.
 */
function PortfolioCallout({
  palette,
  onPress,
}: {
  palette: ReturnType<typeof useTints>['indigo'];
  onPress(): void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open My Portfolio"
      style={({ pressed }) => [
        styles.callout,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          boxShadow: `0px 4px 18px ${colors.shadow}`,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.calloutBadge, { backgroundColor: palette.bg }]}>
        <Ionicons name="briefcase" size={26} color={palette.fg} />
      </View>
      <View style={styles.calloutText}>
        <ThemedText style={[styles.calloutKicker, { color: palette.fg }]}>
          NEW · YOUR PORTFOLIO
        </ThemedText>
        <ThemedText
          themeColor="heading"
          style={styles.calloutTitle}
        >
          Manage education, projects, certificates &amp; more
        </ThemedText>
        <ThemedText
          themeColor="textSecondary"
          style={styles.calloutBody}
        >
          Add your university, projects, achievements, research, resumes,
          and external links — all in one place, right here in the app.
        </ThemedText>
        <View style={styles.calloutCta}>
          <ThemedText style={[styles.calloutCtaText, { color: palette.fg }]}>
            Open My Portfolio
          </ThemedText>
          <Ionicons name="arrow-forward" size={16} color={palette.fg} />
        </View>
      </View>
    </Pressable>
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
  // Removable pill: primary fill, label sits in a real padded region
  // with a circular close button to the right. The close hit-target is
  // 22×22 so it's reliably tappable without crowding the label.
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: 999,
    paddingLeft: Spacing.three,
    paddingRight: 4,
  },
  selectedChipLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
    marginRight: Spacing.two,
  },
  selectedChipClose: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Portfolio callout card — gradient-tinted, big icon, kicker, title,
  // body copy, and a chevron CTA. Designed to be the most prominent
  // element on the page so users understand where to add education etc.
  callout: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three + 2,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    overflow: 'hidden',
  },
  calloutBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutText: {
    flex: 1,
    gap: 4,
  },
  calloutKicker: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  calloutTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  calloutBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  calloutCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  calloutCtaText: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
  },
});
