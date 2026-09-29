import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { getBookListing, uploadHubImage } from '@/features/hub/service';
import { useCreateBookListing, useUpdateBookListing } from '@/features/hub/queries';
import { useTheme } from '@/hooks/use-theme';
import { alertDialog } from '@/lib/confirm';
import { BOOK_CONDITION_LABELS, BOOK_INTENT_LABELS } from '@kse/shared';
import { bookListingFormSchema, type BookListingFormValues } from '@kse/validation';
import type { BookCondition, BookIntent } from '@kse/types';

const CONDITION_OPTIONS = (Object.keys(BOOK_CONDITION_LABELS) as BookCondition[]).map((value) => ({
  value,
  label: BOOK_CONDITION_LABELS[value],
}));
const INTENT_OPTIONS = (Object.keys(BOOK_INTENT_LABELS) as BookIntent[]).map((value) => ({
  value,
  label: BOOK_INTENT_LABELS[value],
}));

const MAX_PHOTOS = 4;

/**
 * Create or edit (with ?id=) a Book Exchange listing (spec student-hub §10).
 * Photos upload to the student-hub bucket before the row is written.
 */
export default function BookPostScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colors = useTheme();
  const [uploading, setUploading] = useState(false);
  const create = useCreateBookListing();
  const update = useUpdateBookListing();

  const { control, handleSubmit, reset, setValue, watch } = useForm<BookListingFormValues>({
    resolver: zodResolver(bookListingFormSchema),
    defaultValues: {
      title: '',
      author: '',
      subject: '',
      edition: '',
      condition: 'good',
      intent: 'exchange',
      price_taka: null,
      expected_exchange: '',
      description: '',
      image_urls: [],
      contact_preference: 'in_app',
      phone: '',
    },
  });

  const intent = useWatch({ control, name: 'intent' });
  const contactPreference = useWatch({ control, name: 'contact_preference' });
  const imageUrls = watch('image_urls') ?? [];

  // Edit mode: hydrate the form from the existing row (owner-read RLS).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const book = await getBookListing(id);
        if (cancelled) return;
        reset({
          title: book.title,
          author: book.author ?? '',
          subject: book.subject ?? '',
          edition: book.edition ?? '',
          condition: book.condition,
          intent: book.intent,
          price_taka: book.price != null ? book.price / 100 : null,
          expected_exchange: book.expected_exchange ?? '',
          description: book.description ?? '',
          image_urls: book.image_urls ?? [],
          contact_preference: book.contact_preference,
          phone: book.phone ?? '',
        });
      } catch {
        void alertDialog({
          title: 'Could not load the listing',
          message: 'Please go back and try again.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reset]);

  const pickImage = async () => {
    if (imageUrls.length >= MAX_PHOTOS) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos access needed', 'Please allow Photos access in Settings to choose a photo.', [
        { text: 'OK' },
      ]);
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

    setUploading(true);
    try {
      const url = await uploadHubImage(asset.uri, mimeType);
      setValue('image_urls', [...imageUrls, url].slice(0, MAX_PHOTOS), {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      void alertDialog({
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => {
    setValue(
      'image_urls',
      imageUrls.filter((u) => u !== url),
      { shouldDirty: true },
    );
  };

  const onSubmit = async (values: BookListingFormValues) => {
    const input = {
      title: values.title,
      author: values.author || undefined,
      subject: values.subject || undefined,
      edition: values.edition || undefined,
      condition: values.condition,
      intent: values.intent,
      price: values.intent === 'sell' ? (values.price_taka ?? null) : null,
      expected_exchange: values.expected_exchange || undefined,
      description: values.description || undefined,
      image_urls: values.image_urls ?? [],
      contact_preference: values.contact_preference,
      phone: values.phone || undefined,
    };

    try {
      if (id) {
        await update.mutateAsync({ id, input });
        void alertDialog({ title: 'Saved', message: 'Your listing was updated.' });
      } else {
        await create.mutateAsync(input);
        void alertDialog({
          title: 'Listing posted',
          message: 'Your book is now visible in the Book Exchange Corner.',
        });
      }
      router.push('/hub/book-exchange/my-listings');
    } catch (error) {
      void alertDialog({
        title: 'Could not save',
        message: error instanceof Error ? error.message : 'Try again.',
      });
    }
  };

  const busy = create.isPending || update.isPending || uploading;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title={id ? 'Edit listing' : 'Post a book'} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.form}>
        <TextField
          control={control}
          name="title"
          label="Book title *"
          placeholder="e.g. Introduction to Algorithms"
        />
        <TextField control={control} name="author" label="Author" placeholder="e.g. Cormen et al." />
        <View style={styles.row}>
          <View style={styles.half}>
            <TextField control={control} name="subject" label="Subject" placeholder="e.g. Physics" />
          </View>
          <View style={styles.half}>
            <TextField control={control} name="edition" label="Edition" placeholder="e.g. 3rd" />
          </View>
        </View>

        <Controller
          control={control}
          name="condition"
          render={({ field: { value, onChange } }) => (
            <SelectField
              label="Condition *"
              value={value}
              options={CONDITION_OPTIONS}
              onSelect={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="intent"
          render={({ field: { value, onChange } }) => (
            <SelectField
              label="Available for *"
              value={value}
              options={INTENT_OPTIONS}
              onSelect={onChange}
            />
          )}
        />

        {intent === 'sell' ? (
          <TextField
            control={control}
            name="price_taka"
            label="Price (BDT) *"
            placeholder="e.g. 650"
            keyboardType="number-pad"
          />
        ) : null}

        {intent === 'exchange' ? (
          <TextField
            control={control}
            name="expected_exchange"
            label="Looking for"
            placeholder="Which book would you accept in exchange?"
          />
        ) : null}

        <TextField
          control={control}
          name="description"
          label="Description"
          placeholder="Condition notes, markings, meeting place…"
        />

        <SegmentedControlWrapper control={control} />
        {contactPreference === 'phone' ? (
          <TextField
            control={control}
            name="phone"
            label="Phone number *"
            placeholder="01XXXXXXXXX"
            keyboardType="phone-pad"
          />
        ) : null}

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">Photos (up to {MAX_PHOTOS})</ThemedText>
          <View style={styles.photoRow}>
            {imageUrls.map((url) => (
              <View key={url} style={styles.photoWrap}>
                <Image source={{ uri: url }} style={styles.photo} contentFit="cover" />
                <Pressable
                  onPress={() => removeImage(url)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  style={[styles.photoRemove, { backgroundColor: colors.danger }]}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            {imageUrls.length < MAX_PHOTOS ? (
              <Pressable
                onPress={pickImage}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                style={[
                  styles.photo,
                  styles.photoAdd,
                  { borderColor: colors.border, backgroundColor: colors.backgroundElement },
                ]}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Add
                    </ThemedText>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>

        <PrimaryButton
          label={id ? 'Save changes' : 'Post listing'}
          onPress={handleSubmit(onSubmit)}
          loading={busy}
        />
      </ScrollView>
    </Screen>
  );
}

/** Contact-method segmented control bound to the form. */
function SegmentedControlWrapper({ control }: { control: Control<BookListingFormValues> }) {
  return (
    <Controller
      control={control}
      name="contact_preference"
      render={({ field: { value, onChange } }) => (
        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">Contact method</ThemedText>
          <SegmentedControl
            options={[
              { value: 'in_app', label: 'In-app' },
              { value: 'phone', label: 'Phone' },
            ]}
            value={value}
            onChange={onChange}
          />
        </View>
      )}
    />
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
    gap: Spacing.one + 2,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 88,
    height: 110,
    borderRadius: 10,
  },
  photoAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 4,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
