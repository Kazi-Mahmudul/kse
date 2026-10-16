import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useBookMentorSession, useMentor } from '@/features/mentorship/queries';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { useAuthStore } from '@/store/auth-store';

// ── Session type options ───────────────────────────────────────────────────
const SESSION_TYPES = [
  {
    id: '1on1',
    label: '1-on-1 Consultation',
    subtitle: 'Personal guidance (30 minutes)',
    price: '৳ 500',
    topic: '1:1 Career Guidance',
  },
  {
    id: 'qna',
    label: 'Q&A Session',
    subtitle: 'Quick questions (15 minutes)',
    price: '৳ 300',
    topic: 'Q&A Session',
  },
  {
    id: 'indepth',
    label: 'In-depth Mentorship',
    subtitle: 'Long session (60 minutes)',
    price: '৳ 900',
    topic: 'In-depth Mentorship',
  },
] as const;

// ── Time slots ──────────────────────────────────────────────────────────────
const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '1:00 PM',
  '3:00 PM', '5:00 PM', '7:00 PM',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function buildWeek(anchor: Date): Date[] {
  const week: Date[] = [];
  // start from Sunday of current week
  const sun = new Date(anchor);
  sun.setDate(anchor.getDate() - anchor.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    week.push(d);
  }
  return week;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Screen 6: Book a Session (reference `6._book_a_session`)
 *
 * Full-page dedicated booking flow:
 * - Mentor summary card with "Change" back link
 * - Session type radio selector (3 options with price + duration)
 * - Week-based date picker with month navigation arrows
 * - Time slot grid (6 slots × 2 rows)
 * - Sticky "Confirm Booking" CTA — submits to mentorship_requests
 */
export default function BookSessionScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack(`/(tabs)/explore/mentorship`);
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionUser = useAuthStore((s) => s.session?.user);

  const mentorQuery = useMentor(id);
  const mentor = mentorQuery.data;
  const bookMutation = useBookMentorSession();

  const today = new Date();
  const [anchorDate, setAnchorDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedTime, setSelectedTime] = useState<string | null>('10:00 AM');
  const [selectedType, setSelectedType] = useState<typeof SESSION_TYPES[number]>(SESSION_TYPES[0]);
  const [confirmed, setConfirmed] = useState(false);

  const week = buildWeek(anchorDate);
  const monthLabel = `${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;

  const handlePrevWeek = () => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - 7);
    setAnchorDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + 7);
    setAnchorDate(d);
  };

  const handleConfirm = async () => {
    if (!mentor) return;
    if (!sessionUser) {
      Alert.alert('Sign in required', 'Please sign in to book a session.');
      return;
    }

    try {
      await bookMutation.mutateAsync({
        opportunity_id: mentor.id,
        topic: selectedType.topic,
        message: `Session booking: ${selectedType.label} (${selectedType.subtitle})`,
        preferred_date: formatDateISO(selectedDate),
        preferred_time: selectedTime ?? undefined,
        session_mode: mentor.opportunity_mode === 'onsite' ? 'offline' : 'online',
        contact_email: sessionUser.email ?? undefined,
        request_type: 'session',
      });
      setConfirmed(true);
    } catch (err: any) {
      Alert.alert('Booking Failed', err.message ?? 'Could not confirm booking. Please try again.');
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.successIcon, { backgroundColor: tints.emerald.bg }]}>
              <Ionicons name="checkmark-circle" size={52} color={tints.emerald.fg} />
            </View>
            <ThemedText themeColor="heading" style={styles.successTitle}>
              Booking Confirmed!
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.successSubtitle}>
              Your {selectedType.label} with {mentor?.title ?? 'the mentor'} on{' '}
              {selectedDate.toDateString()} at {selectedTime} has been submitted.
              The mentor will confirm shortly.
            </ThemedText>
            <PrimaryButton
              label="View My Sessions"
              onPress={() => router.replace('/(tabs)/explore/mentorship/sessions' as any)}
              style={styles.successBtn}
            />
            <PrimaryButton
              label="Back to Profile"
              variant="outline"
              onPress={() => router.back()}
              style={styles.successBtnOutline}
            />
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
          <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.headerBack, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <ThemedText themeColor="heading" style={styles.headerTitle}>
            Book a Session
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Loading state ──────────────────────────────────────────────── */}
        {mentorQuery.isLoading && (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {mentor && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Mentor Summary Card ──────────────────────────────────── */}
            <View
              style={[
                styles.mentorCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.mentorAvatarWrap}>
                <View style={[styles.avatarFallback, { backgroundColor: tints.indigo.bg }]}>
                  <ThemedText style={[styles.avatarInitials, { color: tints.indigo.fg }]}>
                    {initials(mentor.title)}
                  </ThemedText>
                </View>
                {mentor.image_url ? (
                  <Image
                    source={{ uri: mentor.image_url }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : null}
              </View>
              <View style={styles.mentorInfo}>
                <ThemedText themeColor="heading" style={styles.mentorName} numberOfLines={1}>
                  {mentor.title}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.mentorEdu} numberOfLines={1}>
                  {mentor.education ?? mentor.organization_name}
                </ThemedText>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <ThemedText style={styles.ratingText}>
                    {(Number(mentor.rating_avg) || 4.8).toFixed(1)}{' '}
                    <ThemedText themeColor="textSecondary" style={styles.ratingCount}>
                      ({Number(mentor.rating_count) || 1} reviews)
                    </ThemedText>
                  </ThemedText>
                </View>
              </View>
              <Pressable onPress={goBack} hitSlop={8}>
                <ThemedText style={[styles.changeBtn, { color: colors.primary }]}>
                  Change
                </ThemedText>
              </Pressable>
            </View>

            {/* ── Select Session Type ──────────────────────────────────── */}
            <ThemedText themeColor="heading" style={styles.sectionLabel}>
              Select Session Type
            </ThemedText>
            <View style={styles.sessionTypeList}>
              {SESSION_TYPES.map((type) => {
                const isSelected = selectedType.id === type.id;
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => setSelectedType(type)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.sessionTypeCard,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected
                          ? `${colors.primary}08`
                          : colors.background,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        {
                          borderColor: isSelected ? colors.primary : colors.textMuted,
                        },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[styles.radioInner, { backgroundColor: colors.primary }]}
                        />
                      )}
                    </View>
                    <View style={styles.sessionTypeText}>
                      <ThemedText themeColor="heading" style={styles.sessionTypeName}>
                        {type.label}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.sessionTypeSubtitle}>
                        {type.subtitle}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={[styles.sessionTypePrice, { color: colors.heading }]}
                    >
                      {type.price}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Select Date & Time ───────────────────────────────────── */}
            <ThemedText themeColor="heading" style={styles.sectionLabel}>
              Select Date & Time
            </ThemedText>

            {/* Month navigation */}
            <View style={styles.monthRow}>
              <ThemedText themeColor="heading" style={styles.monthLabel}>
                {monthLabel}
              </ThemedText>
              <View style={styles.monthNav}>
                <Pressable onPress={handlePrevWeek} hitSlop={8} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </Pressable>
                <Pressable onPress={handleNextWeek} hitSlop={8} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </Pressable>
              </View>
            </View>

            {/* Day labels */}
            <View style={styles.dayLabelsRow}>
              {DAY_LABELS.map((d) => (
                <ThemedText
                  key={d}
                  themeColor="textSecondary"
                  style={[
                    styles.dayLabel,
                    today.getDay() === DAY_LABELS.indexOf(d) && { color: colors.primary },
                  ]}
                >
                  {d}
                </ThemedText>
              ))}
            </View>

            {/* Week dates */}
            <View style={styles.weekRow}>
              {week.map((day) => {
                const isToday = formatDateISO(day) === formatDateISO(today);
                const isSelected2 = formatDateISO(day) === formatDateISO(selectedDate);
                const isPast = day < today && !isToday;
                return (
                  <Pressable
                    key={day.toISOString()}
                    onPress={() => !isPast && setSelectedDate(day)}
                    disabled={isPast}
                    style={[
                      styles.dayCell,
                      isSelected2 && {
                        backgroundColor: colors.primary,
                        borderRadius: 22,
                      },
                      !isSelected2 && isToday && {
                        borderWidth: 1,
                        borderColor: colors.primary,
                        borderRadius: 22,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dayCellText,
                        isSelected2 && { color: '#fff', fontFamily: FontFamilies.semiBold },
                        !isSelected2 && isToday && { color: colors.primary },
                        isPast && { color: colors.textMuted },
                      ]}
                    >
                      {day.getDate()}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Time slots */}
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((slot) => {
                const isSelected3 = selectedTime === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedTime(slot)}
                    style={[
                      styles.timeSlot,
                      {
                        borderColor: isSelected3 ? colors.primary : colors.border,
                        backgroundColor: isSelected3 ? `${colors.primary}0A` : colors.background,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.timeSlotText,
                        isSelected3 && { color: colors.primary, fontFamily: FontFamilies.semiBold },
                      ]}
                    >
                      {slot}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* ── Confirm Booking sticky CTA ────────────────────────────────── */}
        {mentor && (
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <PrimaryButton
              label="Confirm Booking"
              loading={bookMutation.isPending}
              disabled={!selectedDate || !selectedTime}
              onPress={handleConfirm}
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
  },
  headerBack: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: FontFamilies.semiBold,
  },
  headerSpacer: {
    width: 30,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },

  // Mentor card
  mentorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  mentorAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarFallback: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontFamily: FontFamilies.semiBold,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  mentorInfo: {
    flex: 1,
    gap: 2,
  },
  mentorName: {
    fontSize: 14,
    fontFamily: FontFamilies.semiBold,
  },
  mentorEdu: {
    fontSize: 11,
    fontFamily: FontFamilies.regular,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: FontFamilies.medium,
  },
  ratingCount: {
    fontSize: 11,
    fontFamily: FontFamilies.regular,
  },
  changeBtn: {
    fontSize: 13,
    fontFamily: FontFamilies.semiBold,
  },

  // Section
  sectionLabel: {
    fontSize: 15,
    fontFamily: FontFamilies.semiBold,
    marginTop: 8,
    marginBottom: 4,
  },

  // Session type
  sessionTypeList: {
    gap: 10,
    marginBottom: 8,
  },
  sessionTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sessionTypeText: {
    flex: 1,
    gap: 1,
  },
  sessionTypeName: {
    fontSize: 14,
    fontFamily: FontFamilies.semiBold,
  },
  sessionTypeSubtitle: {
    fontSize: 11,
  },
  sessionTypePrice: {
    fontSize: 15,
    fontFamily: FontFamilies.bold,
  },

  // Calendar
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: FontFamilies.semiBold,
  },
  monthNav: {
    flexDirection: 'row',
    gap: 4,
  },
  monthNavBtn: {
    padding: 4,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FontFamilies.medium,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  dayCellText: {
    fontSize: 14,
    fontFamily: FontFamilies.medium,
  },

  // Time slots
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  timeSlot: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotText: {
    fontSize: 13,
    fontFamily: FontFamilies.medium,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing.three,
    borderTopWidth: 1,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: 16,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: FontFamilies.bold,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: FontFamilies.regular,
  },
  successBtn: {
    width: '100%',
    marginTop: 8,
  },
  successBtnOutline: {
    width: '100%',
  },
});
