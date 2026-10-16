import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useMySessions } from '@/features/mentorship/queries';
import type { MentorSession, SessionStatus } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function formatSessionDate(iso: string | null, time: string | null): string {
  if (!iso) return 'Date TBD';
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const yr = d.getFullYear();
  return `${day} ${mon} ${yr}${time ? ` • ${time}` : ''}`;
}

interface StatusChipProps {
  status: SessionStatus;
}

function StatusChip({ status }: StatusChipProps) {
  const tints = useTints();

  const map: Record<SessionStatus, { label: string; bg: string; fg: string }> = {
    pending: { label: 'Upcoming', bg: tints.indigo.bg, fg: tints.indigo.fg },
    confirmed: { label: 'Confirmed', bg: tints.emerald.bg, fg: tints.emerald.fg },
    completed: { label: 'Completed', bg: tints.slate.bg, fg: tints.slate.fg },
    cancelled: { label: 'Cancelled', bg: '#FEF2F2', fg: '#EF4444' },
  };

  const conf = map[status] ?? map.pending;

  return (
    <View style={[styles.statusChip, { backgroundColor: conf.bg }]}>
      <ThemedText style={[styles.statusChipText, { color: conf.fg }]}>
        {conf.label}
      </ThemedText>
    </View>
  );
}

/**
 * Screen 8: My Sessions (reference `8._my_sessions`)
 *
 * - Segment tab: Upcoming | Past
 * - Session cards: mentor avatar, session type, mentor name, date+time, status badge
 * - Action buttons: View Details → mentor profile | Reschedule → book-session
 * - Loading / empty states
 * - Pull-to-refresh
 */
export default function MySessionsScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const sessionsQuery = useMySessions(tab);
  const sessions: MentorSession[] = sessionsQuery.data ?? [];

  const renderSession = ({ item }: { item: MentorSession }) => (
    <View
      style={[
        styles.sessionCard,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      {/* Card header row */}
      <View style={styles.cardHeader}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarFallback, { backgroundColor: tints.indigo.bg }]}>
            <ThemedText style={[styles.avatarInitials, { color: tints.indigo.fg }]}>
              {initials(item.mentor_title)}
            </ThemedText>
          </View>
          {item.mentor_image_url ? (
            <Image
              source={{ uri: item.mentor_image_url }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : null}
        </View>

        {/* Session info */}
        <View style={styles.sessionInfo}>
          <ThemedText themeColor="heading" style={styles.sessionType} numberOfLines={1}>
            {item.topic}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.mentorName} numberOfLines={1}>
            {item.mentor_title}
          </ThemedText>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.primary} />
            <ThemedText themeColor="textSecondary" style={styles.dateText}>
              {formatSessionDate(item.preferred_date, item.preferred_time)}
            </ThemedText>
          </View>
        </View>

        <StatusChip status={item.status} />
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {/* View Details */}
        <Pressable
          onPress={() =>
            item.opportunity_id &&
            router.push({
              pathname: '/(tabs)/explore/mentorship/[id]' as any,
              params: { id: item.opportunity_id },
            })
          }
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ThemedText themeColor="text" style={styles.actionBtnText}>
            View Details
          </ThemedText>
        </Pressable>

        {/* Reschedule (only for upcoming) */}
        {tab === 'upcoming' && item.status !== 'cancelled' && (
          <Pressable
            onPress={() =>
              item.opportunity_id &&
              router.push({
                pathname: '/(tabs)/explore/mentorship/book-session' as any,
                params: { id: item.opportunity_id },
              })
            }
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText themeColor="text" style={styles.actionBtnText}>
              Reschedule
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: colors.surfaceMuted }]}>
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
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <ThemedText themeColor="heading" style={styles.headerTitle}>
            My Sessions
          </ThemedText>
        </View>

        {/* ── Segment control ──────────────────────────────────────────────── */}
        <View style={[styles.segmentWrap, { backgroundColor: colors.background }]}>
          <View style={[styles.segment, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            {(['upcoming', 'past'] as const).map((t) => {
              const isActive = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[
                    styles.segmentBtn,
                    isActive && { backgroundColor: colors.background },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.segmentLabel,
                      { color: isActive ? colors.heading : colors.textMuted },
                      isActive && { fontFamily: FontFamilies.semiBold },
                    ]}
                  >
                    {t === 'upcoming' ? 'Upcoming' : 'Past'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Sessions list ─────────────────────────────────────────────────── */}
        {sessionsQuery.isLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(s) => s.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={sessionsQuery.isRefetching}
                onRefresh={() => sessionsQuery.refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={renderSession}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon={tab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
                  title={tab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
                  message={
                    tab === 'upcoming'
                      ? 'Book a session with a mentor to get personalised guidance.'
                      : 'Your completed and cancelled sessions will appear here.'
                  }
                  actionLabel={tab === 'upcoming' ? 'Browse Mentors' : undefined}
                  onAction={
                    tab === 'upcoming'
                      ? () => router.push('/(tabs)/explore/mentorship' as any)
                      : undefined
                  }
                />
              </View>
            }
          />
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
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FontFamilies.bold,
  },
  segmentWrap: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: FontFamilies.medium,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.three,
    gap: 12,
    paddingBottom: 32,
  },
  emptyWrap: {
    marginTop: 40,
  },

  // Session card
  sessionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 12,
    elevation: 1,
    boxShadow: '0px 1px 6px rgba(15,23,42,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrap: {
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
    fontSize: 15,
    fontFamily: FontFamilies.semiBold,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionType: {
    fontSize: 15,
    fontFamily: FontFamilies.semiBold,
  },
  mentorName: {
    fontSize: 12,
    fontFamily: FontFamilies.regular,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  dateText: {
    fontSize: 12,
    fontFamily: FontFamilies.regular,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: FontFamilies.semiBold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: FontFamilies.medium,
  },
});
