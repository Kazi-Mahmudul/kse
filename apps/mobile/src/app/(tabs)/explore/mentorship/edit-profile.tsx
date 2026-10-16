import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useMentor,
  useMyMentorApplication,
  useUpdateMentorProfile,
} from '@/features/mentorship/queries';
import { uploadChatAttachment } from '@/features/mentorship/service';
import type { MentorDetail } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

type Mode = 'online' | 'offline' | 'hybrid';

export default function EditMentorProfileScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship/mentor-portal' as any);

  const applicationQuery = useMyMentorApplication();
  const application = applicationQuery.data;
  const opportunityId = application?.opportunity_id;

  const detailQuery = useMentor(opportunityId ?? undefined);
  const mentorDetail = detailQuery.data as MentorDetail | undefined;

  const updateMutation = useUpdateMentorProfile();

  if (applicationQuery.isLoading || (opportunityId && detailQuery.isLoading)) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.root, { backgroundColor: colors.surfaceMuted }]}>
          <Header goBack={goBack} colors={colors} />
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </>
    );
  }

  return (
    <EditMentorProfileForm
      key={opportunityId || application?.id || 'new'}
      mentorDetail={mentorDetail}
      application={application}
      opportunityId={opportunityId}
      updateMutation={updateMutation}
      goBack={goBack}
      colors={colors}
      tints={tints}
    />
  );
}

function EditMentorProfileForm({
  mentorDetail,
  application,
  opportunityId,
  updateMutation,
  goBack,
  colors,
  tints,
}: {
  mentorDetail?: MentorDetail;
  application?: any;
  opportunityId?: string | null;
  updateMutation: ReturnType<typeof useUpdateMentorProfile>;
  goBack: () => void;
  colors: ReturnType<typeof useTheme>;
  tints: ReturnType<typeof useTints>;
}) {
  // Form states initialized directly from query data
  const [title, setTitle] = useState(mentorDetail?.title ?? application?.full_name ?? '');
  const [organization, setOrganization] = useState(mentorDetail?.organization_name ?? application?.organization ?? '');
  const [designation, setDesignation] = useState(mentorDetail?.education ?? application?.designation ?? application?.education ?? '');
  const [experienceYears, setExperienceYears] = useState(String(mentorDetail?.experience_years ?? application?.experience_years ?? 1));
  const [sessionMode, setSessionMode] = useState<Mode>((mentorDetail?.opportunity_mode as Mode) ?? (application?.session_mode as Mode) ?? 'online');
  const [location, setLocation] = useState(mentorDetail?.location ?? '');
  const [summary, setSummary] = useState(mentorDetail?.summary ?? mentorDetail?.description ?? application?.bio ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(mentorDetail?.source_url ?? application?.linkedin_url ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(mentorDetail?.image_url ?? application?.avatar_url ?? null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(mentorDetail?.cover_image_url ?? application?.cover_image_url ?? null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pick & upload avatar
  const handlePickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!res.canceled && res.assets[0]?.uri) {
        setIsUploadingAvatar(true);
        const uploaded = await uploadChatAttachment(
          res.assets[0].uri,
          res.assets[0].mimeType || 'image/jpeg',
        );
        setImageUrl(uploaded);
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e?.message || 'Could not upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Pick & upload cover
  const handlePickCover = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!res.canceled && res.assets[0]?.uri) {
        setIsUploadingCover(true);
        const uploaded = await uploadChatAttachment(
          res.assets[0].uri,
          res.assets[0].mimeType || 'image/jpeg',
        );
        setCoverImageUrl(uploaded);
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e?.message || 'Could not upload cover picture.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async () => {
    if (!opportunityId) {
      Alert.alert('Error', 'No mentor profile found to update.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }
    if (!organization.trim()) {
      Alert.alert('Validation Error', 'Please enter your organization or university.');
      return;
    }
    if (!summary.trim()) {
      Alert.alert('Validation Error', 'Please write a brief bio/summary.');
      return;
    }

    try {
      setIsSaving(true);
      await updateMutation.mutateAsync({
        opportunity_id: opportunityId,
        title: title.trim(),
        organization_name: organization.trim(),
        summary: summary.trim(),
        description: summary.trim(),
        image_url: imageUrl,
        cover_image_url: coverImageUrl,
        education: designation.trim() || undefined,
        experience_years: parseInt(experienceYears, 10) || 1,
        opportunity_mode: sessionMode,
        location: location.trim() || undefined,
        source_url: linkedinUrl.trim() || undefined,
      });

      Alert.alert('Success', 'Mentor profile updated successfully!', [
        { text: 'OK', onPress: () => goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update mentor profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.surfaceMuted }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Header goBack={goBack} colors={colors} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Visual Media Section: Cover & Avatar ───────────────────────── */}
          <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ThemedText themeColor="heading" style={styles.sectionHeaderTitle}>
              Profile Photos
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.sectionHeaderSubtitle}>
              Add an eye-catching cover photo and a professional profile picture.
            </ThemedText>

            {/* Cover photo preview & picker */}
            <View style={styles.coverWrapper}>
              {coverImageUrl ? (
                <Image source={{ uri: coverImageUrl }} style={styles.coverImage} contentFit="cover" />
              ) : (
                <View style={[styles.coverFallback, { backgroundColor: tints.indigo.bg }]}>
                  <Ionicons name="image-outline" size={32} color={tints.indigo.fg} />
                  <ThemedText style={[styles.coverFallbackText, { color: tints.indigo.fg }]}>
                    No Cover Photo
                  </ThemedText>
                </View>
              )}

              <Pressable
                onPress={handlePickCover}
                disabled={isUploadingCover}
                style={({ pressed }) => [
                  styles.coverUploadBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {isUploadingCover ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={16} color="#ffffff" />
                    <ThemedText style={styles.coverUploadBtnText}>
                      {coverImageUrl ? 'Change Cover' : 'Add Cover Photo'}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </View>

            {/* Avatar photo preview & picker */}
            <View style={styles.avatarSectionRow}>
              <View style={[styles.avatarFrame, { borderColor: colors.background }]}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: tints.purple.bg }]}>
                    <ThemedText style={[styles.avatarFallbackText, { color: tints.purple.fg }]}>
                      {title ? title.trim().charAt(0).toUpperCase() : 'M'}
                    </ThemedText>
                  </View>
                )}

                <Pressable
                  onPress={handlePickAvatar}
                  disabled={isUploadingAvatar}
                  style={({ pressed }) => [
                    styles.avatarBadgeBtn,
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  {isUploadingAvatar ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="camera" size={14} color="#ffffff" />
                  )}
                </Pressable>
              </View>

              <View style={styles.avatarMetaText}>
                <ThemedText themeColor="heading" style={styles.avatarTitleText}>
                  Profile Picture
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.avatarHelpText}>
                  Square photo recommended (min 400x400)
                </ThemedText>
                <Pressable onPress={handlePickAvatar} disabled={isUploadingAvatar}>
                  <ThemedText style={[styles.changeTextBtn, { color: colors.primary }]}>
                    Upload New Avatar
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>

          {/* ── Basic Information ─────────────────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ThemedText themeColor="heading" style={styles.sectionHeaderTitle}>
              Mentor Information
            </ThemedText>

            <View style={styles.fieldGroup}>
              <ThemedText themeColor="heading" style={styles.label}>
                Full Name *
              </ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Dr. Tanvir Ahmed"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText themeColor="heading" style={styles.label}>
                Designation & Role *
              </ThemedText>
              <TextInput
                value={designation}
                onChangeText={setDesignation}
                placeholder="e.g. Senior Software Engineer"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText themeColor="heading" style={styles.label}>
                Organization / University *
              </ThemedText>
              <TextInput
                value={organization}
                onChangeText={setOrganization}
                placeholder="e.g. Google / KUET / BRAC"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                ]}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText themeColor="heading" style={styles.label}>
                  Experience (Years)
                </ThemedText>
                <TextInput
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                  ]}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1.5 }]}>
                <ThemedText themeColor="heading" style={styles.label}>
                  Location
                </ThemedText>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Khulna / Dhaka"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                  ]}
                />
              </View>
            </View>

            {/* Session Mode Selector */}
            <View style={styles.fieldGroup}>
              <ThemedText themeColor="heading" style={styles.label}>
                Available Session Mode
              </ThemedText>
              <View style={styles.modePillRow}>
                {(['online', 'offline', 'hybrid'] as Mode[]).map((m) => {
                  const isSelected = sessionMode === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setSessionMode(m)}
                      style={[
                        styles.modePill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceMuted,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          m === 'online'
                            ? 'videocam-outline'
                            : m === 'offline'
                            ? 'location-outline'
                            : 'repeat-outline'
                        }
                        size={14}
                        color={isSelected ? '#ffffff' : colors.textMuted}
                      />
                      <ThemedText
                        style={[
                          styles.modePillText,
                          { color: isSelected ? '#ffffff' : colors.text },
                        ]}
                      >
                        {m === 'online' ? 'Online' : m === 'offline' ? 'In Person' : 'Hybrid'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText themeColor="heading" style={styles.label}>
                LinkedIn Profile URL
              </ThemedText>
              <TextInput
                value={linkedinUrl}
                onChangeText={setLinkedinUrl}
                placeholder="https://linkedin.com/in/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText themeColor="heading" style={styles.label}>
                Bio & About *
              </ThemedText>
              <TextInput
                value={summary}
                onChangeText={setSummary}
                placeholder="Share your expertise, domain knowledge, and how you mentor students..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                ]}
              />
            </View>
          </View>

          {/* ── Save Action ───────────────────────────────────────────────── */}
          <Pressable
            onPress={handleSave}
            disabled={isSaving || isUploadingAvatar || isUploadingCover}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary },
              (isSaving || isUploadingAvatar || isUploadingCover) && { opacity: 0.6 },
              pressed && { opacity: 0.85 },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <ThemedText style={styles.saveBtnText}>Save Profile Changes</ThemedText>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Header({
  goBack,
  colors,
}: {
  goBack: () => void;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <Pressable
        onPress={goBack}
        hitSlop={10}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <ThemedText themeColor="heading" style={styles.headerTitle}>
        Edit Mentor Profile
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamilies.bold,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontFamily: FontFamilies.bold,
    marginBottom: 4,
  },
  sectionHeaderSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  coverWrapper: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFallbackText: {
    fontSize: 12,
    fontFamily: FontFamilies.medium,
    marginTop: 4,
  },
  coverUploadBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coverUploadBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: FontFamilies.medium,
  },
  avatarSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarFrame: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 26,
    fontFamily: FontFamilies.bold,
  },
  avatarBadgeBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  avatarMetaText: {
    flex: 1,
  },
  avatarTitleText: {
    fontSize: 14,
    fontFamily: FontFamilies.semiBold,
  },
  avatarHelpText: {
    fontSize: 12,
    marginTop: 2,
  },
  changeTextBtn: {
    fontSize: 13,
    fontFamily: FontFamilies.medium,
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 13,
    fontFamily: FontFamilies.medium,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FontFamilies.regular,
  },
  textArea: {
    height: 96,
    textAlignVertical: 'top',
  },
  modePillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modePillText: {
    fontSize: 12,
    fontFamily: FontFamilies.medium,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: FontFamilies.bold,
  },
});
