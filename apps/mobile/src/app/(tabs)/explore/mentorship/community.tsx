import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useCreateMentorDiscussion,
  useDeleteMentorDiscussion,
  useMentorDiscussions,
  useMyMentorApplication,
  useMyMentorQuestions,
  useToggleDiscussionLike,
  useUpdateMentorDiscussion,
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
 * Mentors can create new discussions, and edit or delete their own posts.
 * FAB at bottom-right navigates to the Ask a Question screen.
 */
export default function MentorCommunityScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship');

  const [tab, setTab] = useState<'discussions' | 'questions'>('discussions');

  const mentorAppQuery = useMyMentorApplication();
  const isApprovedMentor = mentorAppQuery.data?.status === 'approved';
  const myOpportunityId = mentorAppQuery.data?.opportunity_id;

  const discussionsQuery = useMentorDiscussions();
  const questionsQuery = useMyMentorQuestions();
  const likeMutation = useToggleDiscussionLike();

  const createDiscussionMutation = useCreateMentorDiscussion();
  const updateDiscussionMutation = useUpdateMentorDiscussion();
  const deleteDiscussionMutation = useDeleteMentorDiscussion();

  const discussions: MentorDiscussion[] = discussionsQuery.data ?? [];
  const questions: MentorQuestion[] = questionsQuery.data ?? [];

  const isLoading =
    tab === 'discussions' ? discussionsQuery.isLoading : questionsQuery.isLoading;
  const isRefetching =
    tab === 'discussions' ? discussionsQuery.isRefetching : questionsQuery.isRefetching;
  const refetch =
    tab === 'discussions' ? discussionsQuery.refetch : questionsQuery.refetch;

  // Discussion create / edit modal state
  const [discussionModalVisible, setDiscussionModalVisible] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState<MentorDiscussion | null>(null);
  const [discTitle, setDiscTitle] = useState('');
  const [discContent, setDiscContent] = useState('');
  const [isSubmittingDisc, setIsSubmittingDisc] = useState(false);

  const handleOpenCreateDiscussion = () => {
    setEditingDiscussion(null);
    setDiscTitle('');
    setDiscContent('');
    setDiscussionModalVisible(true);
  };

  const handleOpenEditDiscussion = (disc: MentorDiscussion) => {
    setEditingDiscussion(disc);
    setDiscTitle(disc.title);
    setDiscContent(disc.content);
    setDiscussionModalVisible(true);
  };

  const handleDeleteDiscussion = (discId: string) => {
    Alert.alert(
      'Delete Discussion',
      'Are you sure you want to delete this discussion post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDiscussionMutation.mutateAsync(discId);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete discussion');
            }
          },
        },
      ],
    );
  };

  const handleSaveDiscussion = async () => {
    if (!discTitle.trim() || !discContent.trim()) {
      Alert.alert('Validation Error', 'Title and content cannot be empty.');
      return;
    }
    if (!myOpportunityId) {
      Alert.alert('Error', 'Mentor profile not found.');
      return;
    }

    try {
      setIsSubmittingDisc(true);
      if (editingDiscussion) {
        await updateDiscussionMutation.mutateAsync({
          discussion_id: editingDiscussion.id,
          title: discTitle.trim(),
          content: discContent.trim(),
        });
      } else {
        await createDiscussionMutation.mutateAsync({
          opportunity_id: myOpportunityId,
          title: discTitle.trim(),
          content: discContent.trim(),
        });
      }
      setDiscussionModalVisible(false);
      setEditingDiscussion(null);
      setDiscTitle('');
      setDiscContent('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save discussion');
    } finally {
      setIsSubmittingDisc(false);
    }
  };

  // ── Mentor Discussion Card ─────────────────────────────────────────────────
  const renderDiscussion = ({ item }: { item: MentorDiscussion }) => {
    const isOwnPost = myOpportunityId && item.opportunity_id === myOpportunityId;

    return (
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
              {isOwnPost && (
                <View style={[styles.ownBadge, { backgroundColor: tints.indigo.bg }]}>
                  <ThemedText style={[styles.ownBadgeText, { color: tints.indigo.fg }]}>
                    You
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText themeColor="textSecondary" style={styles.authorRole} numberOfLines={1}>
              {mentorRoleFromOrg(item.mentor_organization, item.mentor_education)}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.postTime}>
              {formatRelative(item.created_at)}
            </ThemedText>
          </View>

          {isOwnPost ? (
            <View style={styles.authorActionGroup}>
              <Pressable
                onPress={() => handleOpenEditDiscussion(item)}
                hitSlop={8}
                style={styles.actionIconBtn}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => handleDeleteDiscussion(item.id)}
                hitSlop={8}
                style={styles.actionIconBtn}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </Pressable>
            </View>
          ) : (
            <Pressable hitSlop={8}>
              <Ionicons name="bookmark-outline" size={18} color={colors.textMuted} />
            </Pressable>
          )}
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
            <Pressable
              style={styles.reactBtn}
              onPress={() =>
                likeMutation.mutate({ discussionId: item.id, liked: item.user_liked ?? false })
              }
              disabled={likeMutation.isPending}
            >
              <Ionicons
                name={item.user_liked ? 'heart' : 'heart-outline'}
                size={14}
                color={item.user_liked ? '#EF4444' : colors.textMuted}
              />
              <ThemedText
                style={[
                  styles.reactCount,
                  { color: item.user_liked ? '#EF4444' : colors.textMuted },
                ]}
              >
                {item.likes_count}
              </ThemedText>
            </Pressable>
            <Pressable
              style={styles.reactBtn}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/explore/mentorship/discussion' as any,
                  params: { discussionId: item.id },
                })
              }
            >
              <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
              <ThemedText themeColor="textSecondary" style={styles.reactCount}>
                {item.comments_count}
              </ThemedText>
            </Pressable>
          </View>

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(tabs)/explore/mentorship/discussion' as any,
                params: { discussionId: item.id },
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
  };

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
          {isApprovedMentor && tab === 'discussions' && (
            <Pressable
              onPress={handleOpenCreateDiscussion}
              style={({ pressed }) => [
                styles.headerNewPostBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <ThemedText style={styles.headerNewPostBtnText}>New Discussion</ThemedText>
            </Pressable>
          )}
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

        {/* ── Modal: Create / Edit Discussion ──────────────────────────────── */}
        <Modal
          visible={discussionModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setDiscussionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <ThemedText themeColor="heading" style={styles.modalTitle}>
                  {editingDiscussion ? 'Edit Discussion Post' : 'Create New Discussion'}
                </ThemedText>
                <Pressable
                  onPress={() => setDiscussionModalVisible(false)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.modalFieldGroup}>
                <ThemedText themeColor="heading" style={styles.modalFieldLabel}>
                  Title *
                </ThemedText>
                <TextInput
                  value={discTitle}
                  onChangeText={setDiscTitle}
                  placeholder="e.g. Tips for Graduate Admissions 2026"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.modalInput,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                  ]}
                />
              </View>

              <View style={styles.modalFieldGroup}>
                <ThemedText themeColor="heading" style={styles.modalFieldLabel}>
                  Content *
                </ThemedText>
                <TextInput
                  value={discContent}
                  onChangeText={setDiscContent}
                  placeholder="Write your advice, roadmap, or insights..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={6}
                  style={[
                    styles.modalInput,
                    styles.modalTextArea,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                  ]}
                />
              </View>

              <View style={styles.modalActionRow}>
                <Pressable
                  onPress={() => setDiscussionModalVisible(false)}
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                >
                  <ThemedText themeColor="textSecondary" style={styles.modalCancelText}>
                    Cancel
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleSaveDiscussion}
                  disabled={isSubmittingDisc}
                  style={[
                    styles.modalSaveBtn,
                    { backgroundColor: colors.primary },
                    isSubmittingDisc && { opacity: 0.6 },
                  ]}
                >
                  {isSubmittingDisc ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.modalSaveText}>
                      {editingDiscussion ? 'Save Changes' : 'Publish Post'}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
  headerTitle: { fontSize: 18, fontFamily: FontFamilies.bold, flex: 1 },
  headerNewPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerNewPostBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: FontFamilies.bold,
  },
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
  ownBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  ownBadgeText: {
    fontSize: 10,
    fontFamily: FontFamilies.bold,
  },
  authorRole: { fontSize: 11 },
  postTime: { fontSize: 11 },
  authorActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    padding: 4,
  },
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FontFamilies.bold,
  },
  modalFieldGroup: {
    gap: 6,
  },
  modalFieldLabel: {
    fontSize: 13,
    fontFamily: FontFamilies.medium,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalTextArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontFamily: FontFamilies.medium,
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: FontFamilies.bold,
  },

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
