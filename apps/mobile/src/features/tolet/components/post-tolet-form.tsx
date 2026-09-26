import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { PrimaryButton } from '@/components/ui/primary-button';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TOLET_GENDER_PREFERENCE_OPTIONS } from '@kse/shared';
import { toletListingFormSchema } from '@kse/validation';
import type { ToletListing, ToletListingSummary } from '@kse/types';

import {
  useSubmitListing,
  useUpdateOwnListing,
} from '../queries';
import { uploadListingImage, deleteListingImage } from '../service';
import { analytics } from '@/lib/analytics';

type FormValues = z.infer<typeof toletListingFormSchema>;

interface PostToletFormProps {
  initialListing?: ToletListing | ToletListingSummary | null;
  initialImageUrls?: string[];
  onSubmitted?: (listingId: string) => void;
}

const CITIES = [
  'Khulna',
  'Dhaka',
  'Jessore',
  'Rajshahi',
  'Chattogram',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
  'Comilla',
];

/**
 * Multi-section Bachelor To-Let form.
 *
 * Sections:
 *   1. Basic (title, summary, description)
 *   2. Rent & Rooms
 *   3. Location
 *   4. Contact
 *   5. Preferences
 *   6. Photos (uploaded to the tolet-listings storage bucket via the user's
 *      JWT; URLs accumulate into the form's `image_urls` field).
 *
 * The image grid is the one piece that doesn't sit behind `react-hook-form`'s
 * validation — it uses `setValue('image_urls', …, { shouldValidate: true })`
 * so the schema's `min(1)` rule still kicks in on submit.
 */
export function PostToletForm({
  initialListing,
  initialImageUrls,
  onSubmitted,
}: PostToletFormProps) {
  const colors = useTheme();
  const isEdit = Boolean(initialListing?.id);
  const submitMutation = useSubmitListing();
  const updateMutation = useUpdateOwnListing();
  const submitting = submitMutation.isPending || updateMutation.isPending;
  const [uploadingImages, setUploadingImages] = useState(0);

  const initialImages = initialImageUrls
    ?? initialListing?.image_urls
    ?? [];

  const { control, handleSubmit, formState, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(toletListingFormSchema) as never,
    defaultValues: {
      title: initialListing?.title ?? '',
      summary: initialListing?.summary ?? '',
      description: (initialListing as ToletListing | undefined)?.description ?? '',
      location: initialListing?.location ?? '',
      city: initialListing?.city ?? 'Khulna',
      area: initialListing?.area ?? '',
      room_type: initialListing?.room_type ?? 'single',
      gender_preference: initialListing?.gender_preference ?? 'any',
      rent_amount: initialListing?.rent_amount ?? 0,
      rent_currency: initialListing?.rent_currency ?? 'BDT',
      available_from: (initialListing as ToletListing | undefined)?.available_from ?? '',
      bachelor_friendly: initialListing?.bachelor_friendly ?? true,
      utilities_included: initialListing?.utilities_included ?? false,
      landlord_phone: (initialListing as ToletListing | undefined)?.landlord_phone ?? '',
      whatsapp: (initialListing as ToletListing | undefined)?.whatsapp ?? '',
      contact_email: (initialListing as ToletListing | undefined)?.contact_email ?? '',
      total_rooms: ((initialListing as ToletListing | undefined)?.total_rooms ?? null) as never,
      available_rooms: (initialListing?.available_rooms ?? null) as never,
      floor: ((initialListing as ToletListing | undefined)?.floor ?? null) as never,
      image_urls: initialImages,
    },
  });

  const imageUrls = watch('image_urls') ?? [];

  const pickAndUpload = useCallback(async () => {
    if (imageUrls.length >= 8) {
      Alert.alert('Photo limit', 'Up to 8 photos per listing.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photos access needed',
        'Please allow Photos access in Settings to choose a photo.',
        [{ text: 'OK' }],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setUploadingImages((n) => n + 1);
    try {
      const url = await uploadListingImage(asset.uri, mimeType);
      setValue(
        'image_urls',
        [...imageUrls, url].slice(0, 8),
        { shouldDirty: true, shouldValidate: true },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      Alert.alert('Upload failed', message);
    } finally {
      setUploadingImages((n) => Math.max(0, n - 1));
    }
  }, [imageUrls, setValue]);

  const removeImage = useCallback(
    async (url: string) => {
      const next = imageUrls.filter((u) => u !== url);
      setValue('image_urls', next, { shouldDirty: true });
      try {
        await deleteListingImage(url);
      } catch {
        // ignore — URL is already removed from the listing.
      }
    },
    [imageUrls, setValue],
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        total_rooms: values.total_rooms ?? null,
        available_rooms: values.available_rooms ?? null,
        floor: values.floor ?? null,
        available_from: values.available_from || null,
        contact_email: values.contact_email || null,
        whatsapp: values.whatsapp || null,
        description: values.description || null,
        summary: values.summary || null,
        area: values.area || null,
      };

      if (isEdit && initialListing) {
        await updateMutation.mutateAsync({
          listingId: initialListing.id,
          payload,
        });
        onSubmitted?.(initialListing.id);
        return;
      }
      const result = await submitMutation.mutateAsync(payload);
      analytics.toletListingSubmitted(result.id);
      onSubmitted?.(result.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submission failed';
      Alert.alert('Could not submit listing', message);
    }
  });

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <FormSection title="Basic information" colors={colors}>
        <TextField
          control={control}
          name="title"
          label="Title"
          placeholder="e.g. Single room near KUET gate"
          autoCapitalize="sentences"
        />
        <TextField
          control={control}
          name="summary"
          label="Short summary"
          placeholder="One-line description for the hub card"
          multiline
          maxLength={300}
        />
        <TextField
          control={control}
          name="description"
          label="Description"
          placeholder="Describe the room, rules, nearby landmarks…"
          multiline
          maxLength={3000}
        />
      </FormSection>

      <FormSection title="Rent & rooms" colors={colors}>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Controller
              control={control}
              name="rent_amount"
              render={({ field }) => (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Monthly rent
                  </Text>
                  <TextInput
                    value={field.value != null ? String(field.value) : ''}
                    onChangeText={(text) => field.onChange(text === '' ? 0 : Number(text))}
                    onBlur={field.onBlur}
                    placeholder="4500"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    style={[
                      styles.input,
                      { backgroundColor: colors.backgroundElement, color: colors.text },
                    ]}
                  />
                </View>
              )}
            />
          </View>
          <View style={styles.flex1}>
            <Controller
              control={control}
              name="rent_currency"
              render={({ field }) => (
                <SelectField
                  label="Currency"
                  value={field.value}
                  options={[
                    { value: 'BDT', label: 'BDT' },
                    { value: 'USD', label: 'USD' },
                    { value: 'INR', label: 'INR' },
                  ]}
                  onSelect={(value) => field.onChange(value ?? 'BDT')}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="room_type"
          render={({ field }) => (
            <SelectField
              label="Room type"
              value={field.value}
              options={[
                { value: 'single', label: 'Single room' },
                { value: 'shared', label: 'Shared room' },
                { value: 'sublet', label: 'Sublet' },
                { value: 'mess_sublet', label: 'Mess sublet' },
                { value: 'studio', label: 'Studio' },
                { value: 'family', label: 'Host family' },
              ]}
              onSelect={(value) => field.onChange(value ?? 'single')}
            />
          )}
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <NumericField
              control={control}
              name="total_rooms"
              label="Total rooms"
              placeholder="3"
            />
          </View>
          <View style={styles.flex1}>
            <NumericField
              control={control}
              name="available_rooms"
              label="Available beds"
              placeholder="1"
            />
          </View>
          <View style={styles.flex1}>
            <NumericField
              control={control}
              name="floor"
              label="Floor"
              placeholder="2"
            />
          </View>
        </View>
      </FormSection>

      <FormSection title="Location" colors={colors}>
        <Controller
          control={control}
          name="city"
          render={({ field }) => (
            <SelectField
              label="City"
              value={field.value}
              options={CITIES.map((c) => ({ value: c, label: c }))}
              onSelect={(value) => field.onChange(value ?? 'Khulna')}
            />
          )}
        />
        <TextField
          control={control}
          name="area"
          label="Area / neighbourhood"
          placeholder="Dattapara"
        />
        <TextField
          control={control}
          name="location"
          label="Address / landmark"
          placeholder="Opposite KUET Gate 2"
        />
        <TextField
          control={control}
          name="available_from"
          label="Available from (YYYY-MM-DD)"
          placeholder="2026-10-01"
          autoCapitalize="none"
        />
      </FormSection>

      <FormSection title="Contact" colors={colors}>
        <TextField
          control={control}
          name="landlord_phone"
          label="Phone (call)"
          placeholder="+880 1XXX-XXXXXX"
          keyboardType="phone-pad"
        />
        <TextField
          control={control}
          name="whatsapp"
          label="WhatsApp"
          placeholder="8801XXXXXXXXX (digits only)"
          keyboardType="phone-pad"
        />
        <TextField
          control={control}
          name="contact_email"
          label="Email (optional)"
          placeholder="landlord@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </FormSection>

      <FormSection title="Preferences" colors={colors}>
        <Controller
          control={control}
          name="gender_preference"
          render={({ field }) => (
            <SelectField
              label="Tenant preference"
              value={field.value}
              options={TOLET_GENDER_PREFERENCE_OPTIONS}
              onSelect={(value) => field.onChange(value ?? 'any')}
            />
          )}
        />
        <CheckboxRow
          colors={colors}
          label="Bachelor friendly"
          value={Boolean(watch('bachelor_friendly'))}
          onChange={(value) => setValue('bachelor_friendly', value, { shouldDirty: true })}
        />
        <CheckboxRow
          colors={colors}
          label="Utilities included in rent"
          value={Boolean(watch('utilities_included'))}
          onChange={(value) => setValue('utilities_included', value, { shouldDirty: true })}
        />
      </FormSection>

      <FormSection title="Photos (1–8)" colors={colors}>
        <View style={styles.imageGrid}>
          {imageUrls.map((url) => (
            <View key={url} style={styles.imageTile}>
              <Image
                source={{ uri: url }}
                style={styles.imageTileImg}
                contentFit="cover"
              />
              <Pressable
                onPress={() => removeImage(url)}
                hitSlop={8}
                style={[
                  styles.imageRemove,
                  { backgroundColor: colors.danger },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {imageUrls.length < 8 ? (
            <Pressable
              onPress={pickAndUpload}
              style={[
                styles.imageAdd,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.backgroundElement,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add photo"
            >
              {uploadingImages > 0 ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="add" size={24} color={colors.primary} />
                  <Text style={[styles.imageAddLabel, { color: colors.textSecondary }]}>
                    Add photo
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
        {formState.errors.image_urls?.message ? (
          <Text style={[styles.error, { color: colors.danger }]}>
            {formState.errors.image_urls.message}
          </Text>
        ) : null}
      </FormSection>

      {formState.errors.root?.message ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {formState.errors.root.message}
        </Text>
      ) : null}

      <PrimaryButton
        label={isEdit ? 'Save changes' : 'Submit listing'}
        loading={submitting || uploadingImages > 0}
        onPress={onSubmit}
      />
      <Text style={[styles.note, { color: colors.textMuted }]}>
        Listings are reviewed by staff before they appear publicly.
      </Text>
    </ScrollView>
  );
}

function FormSection({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.heading ?? colors.text }]}>
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function NumericField({
  control,
  name,
  label,
  placeholder,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  name: keyof FormValues;
  label: string;
  placeholder?: string;
}) {
  const colors = useTheme();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
          <TextInput
            value={field.value != null ? String(field.value) : ''}
            onChangeText={(text) =>
              field.onChange(text === '' ? null : Number(text))
            }
            onBlur={field.onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            style={[
              styles.input,
              { backgroundColor: colors.backgroundElement, color: colors.text },
            ]}
          />
        </View>
      )}
    />
  );
}

function CheckboxRow({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={styles.checkboxRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: colors.border,
            backgroundColor: value ? colors.primary : 'transparent',
          },
        ]}
      >
        {value ? <Ionicons name="checkmark" size={14} color={colors.onPrimary} /> : null}
      </View>
      <Text style={[styles.checkboxLabel, { color: colors.bodyStrong ?? colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionBody: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex1: { flex: 1 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  imageTile: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageTileImg: {
    width: 88,
    height: 88,
  },
  imageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAdd: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAddLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  error: {
    fontSize: 13,
    marginTop: 4,
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
