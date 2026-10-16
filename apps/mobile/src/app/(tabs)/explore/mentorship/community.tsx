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
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useMentorDiscussions,
  useMyMentorQuestions,
} from '@/features/mentorship/queries';
import type { MentorDiscussion, MentorQuestion } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function shortContent(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

function mentorRoleFromOrg(org: string, edu: string | null): string {
  if (edu) {
    const parts = edu.split(/·|\|/);
    return parts[parts.length - 1]?.trim() ?? org;
  }
  return org;
}

/**
 * Screen 10: Community Mentor Section (reference `10._community_mentor_section`)
 *
 * Two tabs:
 * - "Mentor Discussions" — posts authored by verified mentors (mentor_discussions table)
 * - "Student Questions" — the current user's submitted questions (mentor_questions table)
 *
 * FAB at bottom-right navigates to the Ask a Question screen.
 */
export default function MentorCommunityScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship');

  const [tab, setTab] = useState<'discussions' | 'questions'>('discussions');

  const discussionsQuery = useMentorDiscussions();
  const questionsQuery = useMyMentorQuestions();

  const discussions: MentorDiscussion[] = discussionsQuery.data ?? [];
  const questions: MentorQuestion[] = questionsQuery.data ?? [];

  const isLoading =
    tab === 'discussions' ? discussionsQuery.isLoading : questionsQuery.isLoading;
  const isRefetching =
    tab === 'discussions' ? discussionsQuery.isRefetching : questionsQuery.isRefetching;
  const refetch =
    tab === 'discussions' ? discussionsQuery.refetch : questionsQuery.refetch;

  // ── Mentor Discussion Card ─────────────────────────────────────────────────
  const renderDiscussion = ({ item }: { item: MentorDiscussion }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      {/* Author row */}
      <View style={styles.authorRow}>
        <View style={styles.authorAvatarWrap}>
          <View style={[styles.authorAvatarFallback, { backgroundColor: tints.indigo.bg }]}>
            <ThemedText style={[styles.authorInitials, { color: tints.indigo.fg }]}>
              {initials(item.mentor_title)}
            </ThemedText>
          </View>
          {item.mentor_image_url ? (
            <Image
              source={{ uri: item.mentor_image_url }}
              style={styles.authorAvatarImg}
              contentFit="cover"
            />
          ) : null}
        </View>

        <View style={styles.authorMeta}>
          <View style={styles.authorNameRow}>
            <ThemedText themeColor="heading" style={styles.authorName} numberOfLines={1}>
              {item.mentor_title}
            </ThemedText>
            {item.mentor_verified && (
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            )}
          </View>
          <ThemedText themeColor="textSecondary" style={styles.authorRole} numberOfLines={1}>
            {mentorRoleFromOrg(item.mentor_organization, item.mentor_education)}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.postTime}>
            {formatRelative(item.created_at)}
          </ThemedText>
        </View>

        <Pressable hitSlop={8}>
          <Ionicons name="bookmark-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Content */}
      <ThemedText themeColor="heading" style={styles.postTitle}>
        {item.title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.postBody}>
        {shortContent(item.content)}
      </ThemedText>

      {/* Footer: reactions + comments + view link */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Pressable style={styles.reactBtn}>
            <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
            <ThemedText themeColor="textSecondary" style={styles.reactCount}>
              {item.likes_count}
            </ThemedText>
          </Pressable>
          <Pressable style={styles.reactBtn}>
            <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
            <ThemedText themeColor="textSecondary" style={styles.reactCount}>
              {item.comments_count}
            </ThemedText>
          </Pressable>
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(tabs)/explore/mentorship/[id]' as any,
              params: { id: item.opportunity_id },
            })
          }
          hitSlop={6}
        >
          <ThemedText style={[styles.viewLink, { color: colors.primary }]}>
            View Discussion
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );

  // ── Student Question Card ──────────────────────────────────────────────────
  const renderQuestion = ({ item }: { item: MentorQuestion }) => {
    const statusColors: Record<string, { bg: string; fg: string }> = {
      pending: { bg: tints.amber.bg, fg: tints.amber.fg },
      answered: { bg: tints.emerald.bg, fg: tints.emerald.fg },
      closed: { bg: tints.slate.bg, fg: tints.slate.fg },
    };
    const sc = statusColors[item.status] ?? statusColors.pending;

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <View style={styles.questionHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: tints.indigo.bg }]}>
            <ThemedText style={[styles.categoryBadgeText, { color: tints.indigo.fg }]}>
              {item.category}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <ThemedText style={[styles.statusBadgeText, { color: sc.fg }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" style={styles.qTime}>
            {formatRelative(item.created_at)}
          </ThemedText>
        </View>

        <ThemedText themeColor="text" style={styles.questionText}>
          {item.question}
        </ThemedText>

        {item.answer ? (
          <View
            style={[
              styles.answerBox,
              { backgroundColor: tints.emerald.bg, borderColor: tints.emerald.border },
            ]}
          >
            <Ionicons name="chatbubble-ellipses" size={13} color={tints.emerald.fg} />
            <ThemedText style={[styles.answerText, { color: colors.text }]}>
              {item.answer}
            </ThemedText>
          </View>
        ) : (
          <ThemedText themeColor="textMuted" style={styles.awaitingText}>
            Awaiting mentor response…
          </ThemedText>
        )}
      </View>
    );
  };

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
            Community
          </ThemedText>
        </View>

        {/* ── Tab pills ────────────────────────────────────────────────────── */}
        <View
          style={[
            styles.tabPillsWrap,
            { backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
          {([
            { key: 'discussions', label: 'Mentor Discussions' },
            { key: 'questions', label: 'Student Questions' },
          ] as const).map(({ key, label }) => {
            const isActive = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[
                  styles.tabPill,
                  isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                ]}
              >
                <ThemedText
                  style={[
                    styles.tabPillText,
                    { color: isActive ? '#fff' : colors.textMuted },
                    isActive && { fontFamily: FontFamilies.semiBold },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : tab === 'discussions' ? (
          <FlatList
            data={discussions}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            renderItem={renderDiscussion}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="chatbubbles-outline" size={42} color={colors.textMuted} />
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  No mentor discussions yet.{'\n'}Check back soon!
                </ThemedText>
              </View>
            }
          />
        ) : (
          <FlatList
            data={questions}
            keyExtractor={(q) => q.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            renderItem={renderQuestion}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="help-circle-outline" size={42} color={colors.textMuted} />
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  {"You haven't asked any questions yet."}
                </ThemedText>
              </View>
            }
          />
        )}

        {/* ── FAB: Ask a Question ───────────────────────────────────────────── */}
        <Pressable
          onPress={() => router.push('/(tabs)/explore/mentorship/ask' as any)}
          accessibilityLabel="Ask a question"
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>
    </>
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
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: FontFamilies.bold },
  tabPillsWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabPillText: { fontSize: 13, fontFamily: FontFamilies.medium },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.three, gap: 12, paddingBottom: 100 },

  // Cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 10,
    elevation: 1,
    boxShadow: '0px 1px 6px rgba(15,23,42,0.05)',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  authorAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    position: 'relative',
  },
  authorAvatarFallback: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitials: { fontSize: 13, fontFamily: FontFamilies.semiBold },
  authorAvatarImg: {
    position: 'absolute',
    top: 0, left: 0,
    width: 42, height: 42,
    borderRadius: 21,
  },
  authorMeta: { flex: 1, gap: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  authorName: { fontSize: 13, fontFamily: FontFamilies.semiBold },
  authorRole: { fontSize: 11 },
  postTime: { fontSize: 11 },
  postTitle: { fontSize: 15, fontFamily: FontFamilies.semiBold, lineHeight: 21 },
  postBody: { fontSize: 13, lineHeight: 19 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  footerLeft: { flexDirection: 'row', gap: 14 },
  reactBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reactCount: { fontSize: 12 },
  viewLink: { fontSize: 12, fontFamily: FontFamilies.semiBold },

  // Question card
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryBadgeText: { fontSize: 11, fontFamily: FontFamilies.medium },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontFamily: FontFamilies.semiBold },
  qTime: { fontSize: 11, marginLeft: 'auto' },
  questionText: { fontSize: 14, lineHeight: 21 },
  answerBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  answerText: { flex: 1, fontSize: 13, lineHeight: 19 },
  awaitingText: { fontSize: 12, fontStyle: 'italic' },

  emptyBox: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: Spacing.four,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 21 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    boxShadow: '0px 4px 12px rgba(79,70,229,0.35)',
  },
});
