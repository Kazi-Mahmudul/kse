import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/hooks/use-theme';
import {
  mentorSessionRequestSchema,
  type MentorSessionRequestValues,
} from '@kse/validation';
import { useBookMentorSession } from './queries';
import type { MentorDetail } from './types';

interface BookSessionModalProps {
  visible: boolean;
  onClose: () => void;
  mentor: MentorDetail;
  initialType?: 'session' | 'message';
}

export function BookSessionModal({
  visible,
  onClose,
  mentor,
  initialType = 'session',
}: BookSessionModalProps) {
  const colors = useTheme();
  const sessionUser = useAuthStore((s) => s.session?.user);
  const bookMutation = useBookMentorSession();
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
  } = useForm<MentorSessionRequestValues>({
    resolver: zodResolver(mentorSessionRequestSchema),
    defaultValues: {
      request_type: initialType,
      topic: initialType === 'message' ? 'General Inquiry' : '1:1 Career Guidance',
      message: '',
      session_mode: mentor.opportunity_mode === 'onsite' ? 'offline' : 'online',
      preferred_date: new Date().toISOString().split('T')[0],
      preferred_time: '7:00 PM - 8:00 PM',
      contact_email: sessionUser?.email ?? '',
      contact_phone: '',
    },
  });

  const requestType = useWatch({ control, name: 'request_type' });
  const sessionMode = useWatch({ control, name: 'session_mode' });

  const onDismiss = () => {
    reset();
    setSubmitted(false);
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await bookMutation.mutateAsync({
        opportunity_id: mentor.id,
        topic: values.topic,
        message: values.message,
        preferred_date: values.preferred_date || null,
        preferred_time: values.preferred_time || null,
        session_mode: values.session_mode,
        contact_email: values.contact_email || sessionUser?.email || null,
        contact_phone: values.contact_phone || null,
        request_type: values.request_type,
      });
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert(
        'Submission Failed',
        err.message || 'Could not send your request. Please try again.',
      );
    }
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerTitleWrap}>
                <ThemedText style={styles.title}>
                  {requestType === 'session' ? 'Book a Session' : 'Send a Message'}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                >
                  with {mentor.title}
                </ThemedText>
              </View>
              <Pressable
                onPress={onDismiss}
                hitSlop={10}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {submitted ? (
              <View style={styles.successContainer}>
                <View style={[styles.successIconWrap, { backgroundColor: '#10B9811A' }]}>
                  <Ionicons name="checkmark-circle" size={56} color="#10B981" />
                </View>
                <ThemedText style={styles.successTitle}>
                  {requestType === 'session' ? 'Session Requested!' : 'Message Sent!'}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.successMessage}
                >
                  Your request has been forwarded to {mentor.title}. You will receive a
                  confirmation email and app notification when they confirm.
                </ThemedText>
                <PrimaryButton
                  label="Done"
                  onPress={onDismiss}
                  style={styles.doneBtn}
                />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContent}
              >
                {/* Type Selector (Session vs Message) */}
                <View style={styles.modeTabs}>
                  <Pressable
                    onPress={() => {
                      setValue('request_type', 'session');
                      setValue('topic', '1:1 Career Guidance');
                    }}
                    style={[
                      styles.modeTab,
                      requestType === 'session'
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={requestType === 'session' ? '#ffffff' : colors.textSecondary}
                    />
                    <ThemedText
                      style={[
                        styles.modeTabText,
                        requestType === 'session' && { color: '#ffffff' },
                      ]}
                    >
                      Book Session
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setValue('request_type', 'message');
                      setValue('topic', 'General Inquiry');
                    }}
                    style={[
                      styles.modeTab,
                      requestType === 'message'
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={15}
                      color={requestType === 'message' ? '#ffffff' : colors.textSecondary}
                    />
                    <ThemedText
                      style={[
                        styles.modeTabText,
                        requestType === 'message' && { color: '#ffffff' },
                      ]}
                    >
                      Send Message
                    </ThemedText>
                  </Pressable>
                </View>

                {/* Topic field */}
                <TextField
                  control={control}
                  name="topic"
                  label="Topic / Focus Area"
                  placeholder="e.g. Portfolio review, System design roadmap..."
                />

                {requestType === 'session' ? (
                  <>
                    {/* Session Mode Selector: Online vs Offline */}
                    <View style={styles.fieldSection}>
                      <ThemedText type="smallBold" style={styles.fieldLabel}>
                        Meeting Format
                      </ThemedText>
                      <View style={styles.formatRow}>
                        <Pressable
                          onPress={() => setValue('session_mode', 'online')}
                          style={[
                            styles.formatPill,
                            sessionMode === 'online'
                              ? { backgroundColor: colors.primary, borderColor: colors.primary }
                              : { backgroundColor: colors.background, borderColor: colors.border },
                          ]}
                        >
                          <Ionicons
                            name="videocam-outline"
                            size={14}
                            color={sessionMode === 'online' ? '#fff' : colors.textSecondary}
                          />
                          <ThemedText
                            style={[
                              styles.formatText,
                              sessionMode === 'online' && { color: '#fff' },
                            ]}
                          >
                            Online (Google Meet)
                          </ThemedText>
                        </Pressable>

                        <Pressable
                          onPress={() => setValue('session_mode', 'offline')}
                          style={[
                            styles.formatPill,
                            sessionMode === 'offline'
                              ? { backgroundColor: colors.primary, borderColor: colors.primary }
                              : { backgroundColor: colors.background, borderColor: colors.border },
                          ]}
                        >
                          <Ionicons
                            name="location-outline"
                            size={14}
                            color={sessionMode === 'offline' ? '#fff' : colors.textSecondary}
                          />
                          <ThemedText
                            style={[
                              styles.formatText,
                              sessionMode === 'offline' && { color: '#fff' },
                            ]}
                          >
                            In-person ({mentor.location ?? 'Khulna'})
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>

                    {/* Preferred Date & Time */}
                    <TextField
                      control={control}
                      name="preferred_time"
                      label="Preferred Time / Availability"
                      placeholder="e.g. Friday evening, 7:00 PM"
                    />
                  </>
                ) : null}

                {/* Message */}
                <TextField
                  control={control}
                  name="message"
                  label="Your Message / Questions"
                  placeholder="Briefly describe your goals, background, or what you want to achieve..."
                  multiline
                  numberOfLines={4}
                />

                {/* Contact Email & Phone */}
                <TextField
                  control={control}
                  name="contact_email"
                  label="Contact Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TextField
                  control={control}
                  name="contact_phone"
                  label="Contact Phone / WhatsApp (Optional)"
                  placeholder="+880 1..."
                  keyboardType="phone-pad"
                />

                <PrimaryButton
                  label={
                    bookMutation.isPending
                      ? 'Submitting...'
                      : requestType === 'session'
                        ? 'Confirm Session Booking'
                        : 'Send Message to Mentor'
                  }
                  onPress={onSubmit}
                  disabled={bookMutation.isPending}
                  style={styles.submitBtn}
                />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    maxHeight: '90%',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing.four,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontFamily: FontFamilies.bold,
  },
  formContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modeTabText: {
    fontSize: 12,
    fontFamily: FontFamilies.semiBold,
  },
  fieldSection: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: FontFamilies.semiBold,
  },
  formatRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  formatPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  formatText: {
    fontSize: 11,
    fontFamily: FontFamilies.medium,
  },
  submitBtn: {
    marginTop: Spacing.two,
  },
  successContainer: {
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  successTitle: {
    fontSize: 18,
    fontFamily: FontFamilies.bold,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.two,
  },
  doneBtn: {
    width: '100%',
    marginTop: Spacing.four,
  },
});
