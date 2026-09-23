import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { uploadCommunityImage } from '@/features/communities/service';
import { useCommunity, useCreatePost } from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import { alertDialog } from '@/lib/confirm';
import {
  communityPostFormSchema,
  type CommunityPostFormValues,
} from '@kse/validation';
import type { CommunityPostType } from '@kse/types';

const BASE_TYPES: { value: CommunityPostType; label: string }[] = [
  { value: 'discussion', label: 'Discussion' },
  { value: 'question', label: 'Question' },
  { value: 'opportunity', label: 'Opportunity' },
];

/**
 * Create post (spec §Posts): type chips (announcement only for moderators),
 * text, optional link and optional image upload to community-media.
 */
export default function CreateCommunityPostScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityQuery = useCommunity(id);
  const createPost = useCreatePost(id);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const community = communityQuery.data;
  const canAnnounce = community?.role === 'moderator' || community?.role === 'owner';

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CommunityPostFormValues>({
    resolver: zodResolver(communityPostFormSchema),
    defaultValues: { postType: 'discussion', content: '', linkUrl: '' },
  });
  const postType = watch('postType');

  if (communityQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <BackHeader title="Create post" />
      </Screen>
    );
  }
  if (communityQuery.isError || !community) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Create post" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load community"
          message={(communityQuery.error as Error)?.message ?? 'Community not found'}
          actionLabel="Try again"
          onAction={() => communityQuery.refetch()}
        />
      </Screen>
    );
  }

  const pickImage = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
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

  const submit = handleSubmit((values) => {
    createPost.mutate(
      {
        communityId: id,
        postType: values.postType,
        content: values.content,
        imageUrl,
        linkUrl: values.linkUrl.trim() ? values.linkUrl.trim() : null,
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => {
          void alertDialog({ title: 'Could not post', message: error.message });
        },
      },
    );
  });

  return (
    <Screen>
      <BackHeader title={`Post in ${community.name}`} />

      <View style={styles.typeRow}>
        {[...BASE_TYPES, ...(canAnnounce ? [{ value: 'announcement' as const, label: 'Announcement' }] : [])].map(
          (type) => (
            <Chip
              key={type.value}
              label={type.label}
              selected={postType === type.value}
              onPress={() => setValue('postType', type.value, { shouldValidate: true })}
            />
          ),
        )}
      </View>

      <Card tint="background" style={styles.formCard}>
        <TextField
          control={control}
          name="content"
          label="Message"
          placeholder={
            postType === 'question'
              ? 'What do you want to ask?'
              : postType === 'opportunity'
                ? 'Share the opportunity, eligibility and link…'
                : 'Share something with the community…'
          }
          multiline
          textAlignVertical="top"
        />
        {errors.content && (
          <ThemedText type="small" themeColor="danger">
            {errors.content.message}
          </ThemedText>
        )}

        <TextField
          control={control}
          name="linkUrl"
          label="Link (optional)"
          placeholder="https://…"
          autoCapitalize="none"
          keyboardType="url"
        />
        {errors.linkUrl && (
          <ThemedText type="small" themeColor="danger">
            {errors.linkUrl.message}
          </ThemedText>
        )}

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
              {picking ? 'Uploading…' : 'Add image (optional)'}
            </ThemedText>
          </Pressable>
        )}

        <PrimaryButton
          label={createPost.isPending ? 'Posting…' : 'Post'}
          loading={createPost.isPending}
          onPress={() => void submit()}
        />
        {createPost.isError && (
          <ThemedText type="small" themeColor="danger">
            {(createPost.error as Error).message}
          </ThemedText>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
    marginBottom: Spacing.two + 2,
  },
  formCard: {
    gap: Spacing.two,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    borderRadius: 12,
    height: 150,
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
