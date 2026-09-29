import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useHubCategories, useSubmitHubListing } from '@/features/hub/queries';
import { useTheme } from '@/hooks/use-theme';
import { alertDialog } from '@/lib/confirm';
import { HUB_SERVICE_TYPE_LABELS } from '@kse/shared';
import { hubListingFormSchema, type HubListingFormValues } from '@kse/validation';
import { HUB_SERVICE_TYPES, type HubServiceType } from '@kse/types';

const SERVICE_OPTIONS = HUB_SERVICE_TYPES.map((value) => ({
  value,
  label: HUB_SERVICE_TYPE_LABELS[value],
}));

/**
 * Suggest a place/service for the Student Hub (spec student-hub §6).
 * Sends the listing to the `hub-actions` edge function as a
 * `submit_listing`; it lands in the admin review queue as
 * `pending_review` and becomes visible once an admin approves it.
 */
export default function SuggestPlaceScreen() {
  const colors = useTheme();
  const categoriesQuery = useHubCategories();
  const submit = useSubmitHubListing();

  const { control, handleSubmit, setValue } = useForm<HubListingFormValues>({
    resolver: zodResolver(hubListingFormSchema),
    defaultValues: {
      category_id: '',
      name: '',
      service_type: undefined,
      summary: '',
      description: '',
      address: '',
      area: '',
      city: 'Khulna',
      phone: '',
      opening_hours: '',
      services: [],
    },
  });
  const [servicesText, setServicesText] = useState('');

  const categories = categoriesQuery.data ?? [];
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const onSubmit = async (values: HubListingFormValues) => {
    try {
      await submit.mutateAsync({
        category_id: values.category_id,
        name: values.name,
        service_type: values.service_type,
        summary: values.summary || undefined,
        description: values.description || undefined,
        address: values.address || undefined,
        area: values.area || undefined,
        city: values.city,
        phone: values.phone || undefined,
        opening_hours: values.opening_hours || undefined,
        services: values.services ?? [],
      });
      void alertDialog({
        title: 'Suggestion sent',
        message:
          'Thanks! An admin will review the place before it appears in Student Hub.',
      });
      if (router.canGoBack()) router.back();
      else router.replace('/hub');
    } catch (error) {
      void alertDialog({
        title: 'Could not send',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="Suggest a place" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.form}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Know a laundry, bookshop, cafe or repair service other students would
          love? Suggest it — an admin reviews every place before it goes live.
        </ThemedText>

        <TextField
          control={control}
          name="name"
          label="Place name *"
          placeholder="e.g. New Star Laundry"
        />

        <Controller
          control={control}
          name="category_id"
          render={({ field: { value, onChange } }) => (
            <SelectField
              label="Category *"
              value={value || null}
              options={categoryOptions}
              onSelect={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="service_type"
          render={({ field: { value, onChange } }) => (
            <SelectField
              label="Service type *"
              value={value ?? null}
              options={SERVICE_OPTIONS}
              onSelect={(v) => onChange(v as HubServiceType)}
            />
          )}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <TextField control={control} name="area" label="Area" placeholder="e.g. Shibbari" />
          </View>
          <View style={styles.half}>
            <TextField control={control} name="city" label="City *" placeholder="Khulna" />
          </View>
        </View>

        <TextField
          control={control}
          name="address"
          label="Street address"
          placeholder="House / road, landmark"
        />
        <TextField
          control={control}
          name="phone"
          label="Phone"
          placeholder="01XXXXXXXXX"
          keyboardType="phone-pad"
        />
        <TextField
          control={control}
          name="opening_hours"
          label="Opening hours"
          placeholder="e.g. Sat–Thu 9:00–21:00"
        />
        <TextField
          control={control}
          name="summary"
          label="One-line summary"
          placeholder="What is the place known for?"
        />
        <ServicesField
          servicesText={servicesText}
          onChangeServicesText={(text) => {
            setServicesText(text);
            setValue(
              'services',
              text
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              { shouldDirty: true },
            );
          }}
        />

        <PrimaryButton
          label="Send suggestion"
          onPress={handleSubmit(onSubmit)}
          loading={submit.isPending}
        />
      </ScrollView>
    </Screen>
  );
}

/** Comma-separated services input → trimmed array on the form value. */
function ServicesField({
  servicesText,
  onChangeServicesText,
}: {
  servicesText: string;
  onChangeServicesText: (text: string) => void;
}) {
  const colors = useTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        Services (comma-separated)
      </Text>
      <TextInput
        value={servicesText}
        onChangeText={onChangeServicesText}
        placeholder="Wash, Dry cleaning, Pickup"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.fieldInput,
          { backgroundColor: colors.backgroundElement, color: colors.text },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.two + 2,
    paddingBottom: Spacing.five,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  half: {
    flex: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
  },
  fieldInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
});
