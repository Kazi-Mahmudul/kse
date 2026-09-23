import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { uploadCommunityImage } from '@/features/communities/service';
import { useCategories, useCreateCommunityRequest } from '@/features/communities/queries';
import { useDepartments, useUniversities } from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';
import { alertDialog, confirmDialog } from '@/lib/confirm';
import {
  communityRequestTextFormSchema,
  type CommunityRequestTextFormValues,
} from '@kse/validation';

const MAX_RULES = 8;

/**
 * Request a community (spec §Community creation): students never create
 * public communities directly — the request goes to admin review.
 */
export default function CreateCommunityRequestScreen() {
  const colors = useTheme();
  const router = useRouter();
  const categories = useCategories();
  const universities = useUniversities();
  const departments = useDepartments();
  const createRequest = useCreateCommunityRequest();

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [rules, setRules] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CommunityRequestTextFormValues>({
    resolver: zodResolver(communityRequestTextFormSchema),
    defaultValues: {
      name: '',
      description: '',
      purpose: '',
    },
  });

  const departmentOptions = useMemo(
    () =>
      (departments.data ?? [])
        .filter((d) => !universityId || d.university_id === universityId)
        .map((d) => ({ value: d.id, label: d.name })),
    [departments.data, universityId],
  );

  const pickImage = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const url = await uploadCommunityImage(asset.uri, asset.mimeType ?? 'image/jpeg');
      setImageUrl(url);
    } catch (error) {
      void alertDialog({
        title: 'Could not upload image',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setPicking(false);
    }
  };

  const submit = handleSubmit(
    async (values) => {
      if (!categoryId) {
        setSubmitError('Choose a category');
        return;
      }
      setSubmitError(null);
      const confirmed = await confirmDialog({
        title: 'Submit request?',
        message: 'An admin will review your request. You can track its status in the Following tab.',
        confirmLabel: 'Submit',
      });
      if (!confirmed) return;

      createRequest.mutate(
        {
          name: values.name,
          categoryId,
          description: values.description,
          purpose: values.purpose,
          universityId,
          departmentId,
          rules,
          imageUrl,
        },
        {
          onSuccess: () => {
            router.back();
            void alertDialog({
              title: 'Request submitted',
              message: 'Your community request is now pending admin review.',
            });
          },
          onError: (error) => setSubmitError(error.message),
        },
      );
    },
    () => setSubmitError(null),
  );

  return (
    <Screen scroll={false}>
      <BackHeader title="Request a community" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card tint="backgroundElement" style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
            Communities are reviewed by admins before becoming public. Describe
            the purpose clearly to speed up approval.
          </ThemedText>
        </Card>

        <Card tint="background" style={styles.formCard}>
          <TextField
            control={control}
            name="name"
            label="Community name"
            placeholder="e.g. Khulna Debate Forum"
          />
          {errors.name && (
            <ThemedText type="small" themeColor="danger">
              {errors.name.message}
            </ThemedText>
          )}

          <SelectField
            label="Category"
            value={categoryId}
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            onSelect={(value) => setCategoryId(value)}
            clearable={false}
          />
          {submitError === 'Choose a category' && (
            <ThemedText type="small" themeColor="danger">
              {submitError}
            </ThemedText>
          )}

          <SelectField
            label="University (optional)"
            value={universityId}
            options={(universities.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
            onSelect={(value) => {
              setUniversityId(value);
              setDepartmentId(null);
            }}
          />
          {universityId && (
            <SelectField
              label="Department (optional)"
              value={departmentId}
              options={departmentOptions}
              onSelect={setDepartmentId}
            />
          )}

          <TextField
            control={control}
            name="description"
            label="Description"
            placeholder="What is this community about?"
            multiline
            textAlignVertical="top"
          />
          {errors.description && (
            <ThemedText type="small" themeColor="danger">
              {errors.description.message}
            </ThemedText>
          )}

          <TextField
            control={control}
            name="purpose"
            label="Purpose"
            placeholder="Why should this community exist?"
            multiline
            textAlignVertical="top"
          />
          {errors.purpose && (
            <ThemedText type="small" themeColor="danger">
              {errors.purpose.message}
            </ThemedText>
          )}
        </Card>

        <Card tint="background" style={styles.formCard}>
          <ThemedText type="smallBold">Proposed rules (optional)</ThemedText>
          {rules.map((rule, index) => (
            <View key={index} style={styles.ruleRow}>
              <TextInput
                value={rule}
                onChangeText={(text) =>
                  setRules((current) => current.map((r, i) => (i === index ? text : r)))
                }
                placeholder={`Rule ${index + 1}`}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.ruleInputText,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.background,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove rule ${index + 1}`}
                onPress={() => setRules((current) => current.filter((_, i) => i !== index))}
                style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ))}
          {rules.length < MAX_RULES && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setRules((current) => [...current, ''])}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <ThemedText type="small" themeColor="primary">
                Add rule
              </ThemedText>
            </Pressable>
          )}
        </Card>

        <Card tint="background" style={styles.formCard}>
          <ThemedText type="smallBold">Community image (optional)</ThemedText>
          {imageUrl ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
              <Pressable
                accessibilityRole="button"
                onPress={() => setImageUrl(null)}
                style={[styles.imageRemove, { backgroundColor: colors.background }]}
              >
                <Ionicons name="close" size={14} color={colors.danger} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void pickImage();
              }}
              style={({ pressed }) => [
                styles.imagePicker,
                { borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="image-outline" size={16} color={colors.primary} />
              <ThemedText type="small" themeColor="primary">
                {picking ? 'Uploading…' : 'Add an image'}
              </ThemedText>
            </Pressable>
          )}
        </Card>

        {submitError && submitError !== 'Choose a category' && (
          <ThemedText type="small" themeColor="danger">
            {submitError}
          </ThemedText>
        )}

        <PrimaryButton
          label={createRequest.isPending ? 'Submitting…' : 'Submit request'}
          loading={createRequest.isPending}
          onPress={() => void submit()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.two + 2,
    paddingBottom: Spacing.five,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
  },
  formCard: {
    gap: Spacing.two,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  ruleInputText: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    fontSize: 13,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: 4,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    borderRadius: 12,
    height: 140,
    width: '100%',
  },
  imageRemove: {
    position: 'absolute',
    top: Spacing.one + 2,
    right: Spacing.one + 2,
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: Spacing.two + 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
