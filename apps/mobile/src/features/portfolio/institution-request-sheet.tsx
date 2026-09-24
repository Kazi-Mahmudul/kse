import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  educationInstitutionRequestSchema,
  type EducationInstitutionRequestInput,
} from '@kse/validation';
import {
  EDUCATION_INSTITUTION_OWNERSHIP_LABELS,
  EDUCATION_INSTITUTION_TYPE_LABELS,
} from '@kse/shared';
import type {
  EducationInstitutionOwnership,
  EducationInstitutionType,
} from '@kse/types';

import { useSubmitInstitutionRequest } from './institution-queries';
import { institutionTypesForLevel } from './institutions';

const TYPE_OPTIONS: SelectOption[] = (
  Object.entries(EDUCATION_INSTITUTION_TYPE_LABELS) as [
    EducationInstitutionType,
    string,
  ][]
).map(([value, label]) => ({ value, label }));

const OWNERSHIP_OPTIONS: SelectOption[] = (
  Object.entries(EDUCATION_INSTITUTION_OWNERSHIP_LABELS) as [
    EducationInstitutionOwnership,
    string,
  ][]
).map(([value, label]) => ({ value, label }));

interface InstitutionRequestSheetProps {
  visible: boolean;
  level: string | null;
  district: string | null;
  onClose(): void;
  onSubmitted(name: string): void;
}

/**
 * Bottom-sheet for students to submit a new-institution request. We
 * pre-populate the type from the chosen education level (so e.g. selecting
 * "Diploma" defaults the type to polytechnic) and the city from the
 * district picker.
 */
export function InstitutionRequestSheet({
  visible,
  level,
  district,
  onClose,
  onSubmitted,
}: InstitutionRequestSheetProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const submit = useSubmitInstitutionRequest();

  const defaultType: EducationInstitutionType =
    (institutionTypesForLevel(level)[0] as EducationInstitutionType | undefined) ??
    'university';

  const form = useForm<EducationInstitutionRequestInput>({
    resolver: zodResolver(educationInstitutionRequestSchema),
    defaultValues: {
      name: '',
      name_bn: '',
      type: defaultType,
      ownership_type: '',
      city: district ?? '',
      area: '',
    },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await submit.mutateAsync({
        name: values.name.trim(),
        name_bn: values.name_bn.trim() === '' ? null : values.name_bn.trim(),
        type: values.type,
        ownership_type:
          values.ownership_type === '' ? null : (values.ownership_type as EducationInstitutionOwnership),
        city: values.city.trim() === '' ? null : values.city.trim(),
        area: values.area.trim() === '' ? null : values.area.trim(),
      });
      const submittedName = values.name.trim();
      form.reset();
      onSubmitted(submittedName);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not submit the request.',
      );
    }
  });

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
            <View style={styles.header}>
              <ThemedText type="smallBold">Request institution</ThemedText>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
              Tell us which institution is missing. We&apos;ll review and add it
              within a few days.
            </ThemedText>

            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Name</Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="e.g. Khulna Zilla School"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                    style={[
                      styles.input,
                      { backgroundColor: colors.backgroundElement, color: colors.text },
                    ]}
                  />
                  {fieldState.error ? (
                    <Text style={[styles.error, { color: colors.danger }]}>
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={form.control}
              name="name_bn"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Bangla name (optional)</Text>
                  <TextInput
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="খুলনা জিলা স্কুল"
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      styles.input,
                      { backgroundColor: colors.backgroundElement, color: colors.text },
                    ]}
                  />
                  {fieldState.error ? (
                    <Text style={[styles.error, { color: colors.danger }]}>
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={form.control}
              name="type"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <SelectField
                    label="Type"
                    value={(field.value as string | null) ?? null}
                    options={TYPE_OPTIONS}
                    onSelect={(value) => field.onChange(value ?? '')}
                    placeholder="Choose a type"
                    clearable={false}
                  />
                  {fieldState.error ? (
                    <Text style={[styles.error, { color: colors.danger }]}>
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={form.control}
              name="ownership_type"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <SelectField
                    label="Ownership (optional)"
                    value={(field.value as string | null) ?? null}
                    options={OWNERSHIP_OPTIONS}
                    onSelect={(value) => field.onChange(value ?? '')}
                    placeholder="Public / Private / Other"
                  />
                  {fieldState.error ? (
                    <Text style={[styles.error, { color: colors.danger }]}>
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={form.control}
              name="city"
              render={({ field }) => (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>City</Text>
                  <TextInput
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Khulna"
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      styles.input,
                      { backgroundColor: colors.backgroundElement, color: colors.text },
                    ]}
                  />
                </View>
              )}
            />

            <Controller
              control={form.control}
              name="area"
              render={({ field }) => (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Area (optional)</Text>
                  <TextInput
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Gollamari, Khulna"
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      styles.input,
                      { backgroundColor: colors.backgroundElement, color: colors.text },
                    ]}
                  />
                </View>
              )}
            />

            {submitError ? (
              <Text style={[styles.error, { color: colors.danger }]}>{submitError}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.submitRow}>
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.submitButton}
            />
            <PrimaryButton
              label={submit.isPending ? 'Submitting…' : 'Submit request'}
              onPress={handleSubmit}
              loading={submit.isPending}
              style={styles.submitButton}
            />
          </View>
        </ThemedView>
      </Pressable>
    </Modal>
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  body: {
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  intro: {
    marginBottom: Spacing.one,
  },
  field: {
    gap: 6,
    marginBottom: Spacing.three - 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
  },
  submitRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  submitButton: {
    flex: 1,
  },
});
