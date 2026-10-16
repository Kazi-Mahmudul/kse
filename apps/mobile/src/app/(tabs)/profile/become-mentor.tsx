import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useMyMentorApplication,
  useSubmitMentorApplication,
} from '@/features/mentorship/queries';
import type {
  MentorApplication,
  SubmitMentorApplicationPayload,
} from '@/features/mentorship/types';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { useAuthStore } from '@/store/auth-store';

const EXPERTISE_OPTIONS = [
  'Career Guidance',
  'Scholarship Guidance',
  'Research & Publication',
  'Research Partners',
  'Academic Support',
  'Programming',
  'Data Science',
  'Machine Learning',
  'UI/UX Design',
  'Product Management',
  'Entrepreneurship',
  'Finance',
  'IELTS / TOEFL',
  'Study Abroad',
  'Job Interview Prep',
];

const SESSION_MODE_OPTIONS: { label: string; value: 'online' | 'offline' | 'hybrid' }[] = [
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
  { label: 'Hybrid', value: 'hybrid' },
];

function StatusBanner({
  application,
  colors,
  tints,
}: {
  application: MentorApplication;
  colors: ReturnType<typeof useTheme>;
  tints: ReturnType<typeof useTints>;
}) {
  const isApproved = application.status === 'approved';
  const isRejected = application.status === 'rejected';
  const isPending = application.status === 'pending';

  const bannerColor = isApproved
    ? tints.emerald
    : isRejected
      ? { bg: '#FEF2F2', border: '#FEE2E2', fg: '#EF4444' }
      : tints.amber;

  const statusIcon = isApproved
    ? 'checkmark-circle'
    : isRejected
      ? 'close-circle'
      : 'time';

  const statusText = isApproved
    ? 'Application Approved!'
    : isRejected
      ? 'Application Rejected'
      : 'Application Under Review';

  const statusDescription = isApproved
    ? 'You are now a verified mentor. Your profile is live on the platform and students can book sessions with you.'
    : isRejected
      ? `Your application was not approved.${application.admin_note ? ` Admin note: "${application.admin_note}"` : ' You may re-apply with updated information.'}`
      : 'Our team is reviewing your application. This usually takes 1–3 business days. We will notify you once a decision is made.';

  return (
    <View
      style={[
        styles.statusBanner,
        { backgroundColor: bannerColor.bg, borderColor: bannerColor.border },
      ]}
    >
      <Ionicons name={statusIcon as any} size={28} color={bannerColor.fg} />
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText style={[styles.statusBannerTitle, { color: bannerColor.fg }]}>
          {statusText}
        </ThemedText>
        <ThemedText style={[styles.statusBannerDesc, { color: colors.text }]}>
          {statusDescription}
        </ThemedText>
      </View>
    </View>
  );
}

function ApplicationSummary({
  application,
  colors,
}: {
  application: MentorApplication;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <ThemedText themeColor="heading" style={styles.summaryTitle}>
        Your Application
      </ThemedText>
      <View style={styles.summaryRow}>
        <ThemedText themeColor="textMuted" style={styles.summaryLabel}>Name</ThemedText>
        <ThemedText themeColor="text" style={styles.summaryValue}>{application.full_name}</ThemedText>
      </View>
      <View style={styles.summaryRow}>
        <ThemedText themeColor="textMuted" style={styles.summaryLabel}>Organization</ThemedText>
        <ThemedText themeColor="text" style={styles.summaryValue}>{application.organization}</ThemedText>
      </View>
      <View style={styles.summaryRow}>
        <ThemedText themeColor="textMuted" style={styles.summaryLabel}>Designation</ThemedText>
        <ThemedText themeColor="text" style={styles.summaryValue}>{application.designation}</ThemedText>
      </View>
      <View style={styles.summaryRow}>
        <ThemedText themeColor="textMuted" style={styles.summaryLabel}>Experience</ThemedText>
        <ThemedText themeColor="text" style={styles.summaryValue}>
          {application.experience_years} year{application.experience_years !== 1 ? 's' : ''}
        </ThemedText>
      </View>
      <View style={styles.summaryRow}>
        <ThemedText themeColor="textMuted" style={styles.summaryLabel}>Session Mode</ThemedText>
        <ThemedText themeColor="text" style={styles.summaryValue}>
          {application.session_mode.charAt(0).toUpperCase() + application.session_mode.slice(1)}
        </ThemedText>
      </View>
      {application.expertise_areas.length > 0 && (
        <View style={styles.summaryRow}>
          <ThemedText themeColor="textMuted" style={styles.summaryLabel}>Expertise</ThemedText>
          <ThemedText themeColor="text" style={[styles.summaryValue, { flex: 1 }]}>
            {application.expertise_areas.join(', ')}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

/**
 * Become a Mentor — profile route
 *
 * States:
 * 1. No application → Show rich application form
 * 2. Pending application → Status banner + summary
 * 3. Approved → Banner + "Go to Mentor Portal" CTA
 * 4. Rejected → Banner + option to re-apply
 */
export default function BecomeMentorScreen() {
  const colors = useTheme();
  const tints = useTints();
  const sessionUser = useAuthStore((s) => s.session?.user);

  const applicationQuery = useMyMentorApplication();
  const submitMutation = useSubmitMentorApplication();

  const application = applicationQuery.data as MentorApplication | null | undefined;

  // Form state
  const [fullName, setFullName] = useState(sessionUser?.user_metadata?.full_name ?? '');
  const [email, setEmail] = useState(sessionUser?.email ?? '');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');
  const [experienceYears, setExperienceYears] = useState('3');
  const [education, setEducation] = useState('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [sessionMode, setSessionMode] = useState<'online' | 'offline' | 'hybrid'>('online');
  const [formError, setFormError] = useState('');
  const [showReApply, setShowReApply] = useState(false);

  const toggleExpertise = (area: string) => {
    setExpertiseAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };

  const handleSubmit = async () => {
    setFormError('');

    if (!fullName.trim()) { setFormError('Full name is required'); return; }
    if (!email.trim()) { setFormError('Email is required'); return; }
    if (!organization.trim()) { setFormError('Organization is required'); return; }
    if (!designation.trim()) { setFormError('Designation/Title is required'); return; }
    if (!education.trim()) { setFormError('Education background is required'); return; }
    if (expertiseAreas.length === 0) { setFormError('Select at least one area of expertise'); return; }
    if (!bio.trim() || bio.trim().length < 50) { setFormError('Bio must be at least 50 characters'); return; }

    const expYears = parseInt(experienceYears, 10);
    if (isNaN(expYears) || expYears < 1) { setFormError('Enter valid years of experience'); return; }

    const payload: SubmitMentorApplicationPayload = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      organization: organization.trim(),
      designation: designation.trim(),
      experience_years: expYears,
      education: education.trim(),
      expertise_areas: expertiseAreas,
      bio: bio.trim(),
      linkedin_url: linkedinUrl.trim() || undefined,
      session_mode: sessionMode,
    };

    try {
      await submitMutation.mutateAsync(payload);
      setShowReApply(false);
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  if (applicationQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <BackHeader title="Become a Mentor" />
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  // Status screen — has existing application
  if (application && !showReApply) {
    return (
      <Screen>
        <BackHeader title="Become a Mentor" />
        <View style={styles.statusContent}>
          <StatusBanner application={application} colors={colors} tints={tints} />
          <ApplicationSummary application={application} colors={colors} />

          {application.status === 'approved' && (
            <PrimaryButton
              label="Open Mentor Portal"
              onPress={() => router.push('/(tabs)/explore/mentorship/mentor-portal' as any)}
            />
          )}
          {application.status === 'rejected' && (
            <Pressable
              onPress={() => setShowReApply(true)}
              style={({ pressed }) => [
                styles.reApplyBtn,
                { borderColor: colors.primary },
                pressed && { opacity: 0.7 },
              ]}
            >
              <ThemedText style={[styles.reApplyText, { color: colors.primary }]}>
                Re-apply with Updated Information
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Screen>
    );
  }

  // Application form
  return (
    <Screen>
      <BackHeader title="Become a Mentor" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroBanner, { backgroundColor: tints.indigo.bg }]}>
          <Ionicons name="ribbon" size={32} color={tints.indigo.fg} />
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText style={[styles.heroTitle, { color: colors.heading }]}>
              Share Your Expertise
            </ThemedText>
            <ThemedText style={[styles.heroDesc, { color: colors.textSecondary }]}>
              Guide students in their academic and professional journeys. Our admin team will review your application within 1–3 business days.
            </ThemedText>
          </View>
        </View>

        {/* Section: Personal Info */}
        <ThemedText themeColor="textMuted" style={styles.sectionLabel}>
          PERSONAL INFORMATION
        </ThemedText>

        <InputField
          label="Full Name *"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          colors={colors}
        />
        <InputField
          label="Email *"
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          keyboardType="email-address"
          colors={colors}
        />
        <InputField
          label="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="+880 1XXX XXXXXX"
          keyboardType="phone-pad"
          colors={colors}
        />
        <InputField
          label="LinkedIn Profile URL (optional)"
          value={linkedinUrl}
          onChangeText={setLinkedinUrl}
          placeholder="https://linkedin.com/in/your-profile"
          keyboardType="url"
          colors={colors}
        />

        {/* Section: Professional */}
        <ThemedText themeColor="textMuted" style={[styles.sectionLabel, { marginTop: 24 }]}>
          PROFESSIONAL BACKGROUND
        </ThemedText>

        <InputField
          label="Organization / Company *"
          value={organization}
          onChangeText={setOrganization}
          placeholder="e.g. Khulna University, Brain Station 23"
          colors={colors}
        />
        <InputField
          label="Designation / Title *"
          value={designation}
          onChangeText={setDesignation}
          placeholder="e.g. Senior Engineer, Research Fellow"
          colors={colors}
        />
        <InputField
          label="Years of Experience *"
          value={experienceYears}
          onChangeText={setExperienceYears}
          placeholder="e.g. 5"
          keyboardType="numeric"
          colors={colors}
        />
        <InputField
          label="Education Background *"
          value={education}
          onChangeText={setEducation}
          placeholder="e.g. BSc CSE · KUET"
          colors={colors}
        />

        {/* Session Mode */}
        <ThemedText themeColor="heading" style={styles.fieldLabel}>
          Session Mode *
        </ThemedText>
        <View style={styles.sessionModeRow}>
          {SESSION_MODE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setSessionMode(opt.value)}
              style={[
                styles.sessionModeBtn,
                {
                  backgroundColor:
                    sessionMode === opt.value ? colors.primary : colors.surfaceMuted,
                  borderColor:
                    sessionMode === opt.value ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.sessionModeBtnText,
                  { color: sessionMode === opt.value ? '#fff' : colors.textMuted },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Bio */}
        <ThemedText themeColor="textMuted" style={[styles.sectionLabel, { marginTop: 24 }]}>
          YOUR BIO
        </ThemedText>

        <View>
          <ThemedText themeColor="heading" style={styles.fieldLabel}>
            About You / Guidance Approach * (min. 50 chars)
          </ThemedText>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell students about your background, what drives you to mentor, and how you can help them..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            maxLength={1000}
            style={[
              styles.textArea,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <ThemedText themeColor="textMuted" style={styles.charCount}>
            {bio.length}/1000
          </ThemedText>
        </View>

        {/* Expertise areas */}
        <ThemedText themeColor="textMuted" style={[styles.sectionLabel, { marginTop: 24 }]}>
          AREAS OF EXPERTISE *
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.expertiseHint}>
          Select all that apply
        </ThemedText>
        <View style={styles.expertiseGrid}>
          {EXPERTISE_OPTIONS.map((area) => {
            const selected = expertiseAreas.includes(area);
            return (
              <Pressable
                key={area}
                onPress={() => toggleExpertise(area)}
                style={[
                  styles.expertiseChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surfaceMuted,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.expertiseChipText,
                    { color: selected ? '#fff' : colors.textMuted },
                  ]}
                >
                  {area}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Error */}
        {formError ? (
          <View
            style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}
          >
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <ThemedText style={[styles.errorText, { color: '#EF4444' }]}>{formError}</ThemedText>
          </View>
        ) : null}

        {/* Submit */}
        <View style={styles.submitWrap}>
          <PrimaryButton
            label={submitMutation.isPending ? 'Submitting…' : 'Submit Application'}
            onPress={handleSubmit}
            disabled={submitMutation.isPending}
          />
          <ThemedText themeColor="textMuted" style={styles.submitNote}>
            By submitting, you agree to be listed as a mentor on the platform. Admin approval required.
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'url';
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText themeColor="heading" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'sentences'}
        style={[
          styles.textInput,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },

  statusContent: {
    flex: 1,
    padding: Spacing.three,
    gap: 16,
  },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBannerTitle: { fontSize: 16, fontFamily: FontFamilies.bold },
  statusBannerDesc: { fontSize: 13, lineHeight: 19 },

  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 10,
  },
  summaryTitle: { fontSize: 15, fontFamily: FontFamilies.semiBold, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  summaryLabel: { fontSize: 12, fontFamily: FontFamilies.medium, width: 90, flexShrink: 0 },
  summaryValue: { fontSize: 13, flex: 1 },

  reApplyBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  reApplyText: { fontSize: 14, fontFamily: FontFamilies.semiBold },

  formContent: {
    padding: Spacing.three,
    paddingBottom: 48,
    gap: 14,
  },

  heroBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: Spacing.three,
    borderRadius: 16,
  },
  heroTitle: { fontSize: 16, fontFamily: FontFamilies.bold },
  heroDesc: { fontSize: 13, lineHeight: 19 },

  sectionLabel: {
    fontSize: 10,
    fontFamily: FontFamilies.bold,
    letterSpacing: 1.2,
    marginBottom: -6,
    marginTop: 8,
  },
  fieldLabel: { fontSize: 13, fontFamily: FontFamilies.semiBold, marginBottom: 6 },

  inputGroup: { gap: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    fontSize: 14,
    fontFamily: FontFamilies.regular,
  },

  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FontFamilies.regular,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },

  sessionModeRow: { flexDirection: 'row', gap: 10 },
  sessionModeBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  sessionModeBtnText: { fontSize: 13, fontFamily: FontFamilies.semiBold },

  expertiseHint: { fontSize: 12, marginTop: -6 },
  expertiseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expertiseChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  expertiseChipText: { fontSize: 12, fontFamily: FontFamilies.medium },

  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: FontFamilies.medium },

  submitWrap: { gap: 10, marginTop: 8 },
  submitNote: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
