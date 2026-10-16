import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useAddDiscussionComment,
  useDeleteMentorDiscussion,
  useDiscussionComments,
  useMentorDiscussions,
  useMyMentorApplication,
  useToggleDiscussionLike,
  useUpdateMentorDiscussion,
} from '@/features/mentorship/queries';
import type { MentorDiscussion, MentorDiscussionComment } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

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

/**
 * Discussion Detail Screen — shows full content, likes, and comments for
 * a mentor discussion post.
 * Allows mentors to edit or delete their own posts.
 * Includes Realtime updates for newly added comments.
 */
export default function DiscussionDetailScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship/community' as any);
  const params = useLocalSearchParams<{ discussionId?: string; id?: string }>();
  const discussionId = params.discussionId || params.id;
  const sessionUser = useAuthStore((s) => s.session?.user);

  const mentorAppQuery = useMyMentorApplication();
  const myOpportunityId = mentorAppQuery.data?.opportunity_id;

  const discussionsQuery = useMentorDiscussions();
  const discussion: MentorDiscussion | undefined = discussionsQuery.data?.find(
    (d) => d.id === discussionId,
  );

  const commentsQuery = useDiscussionComments(discussionId ?? '');
  const comments: MentorDiscussionComment[] = commentsQuery.data ?? [];

  const likeMutation = useToggleDiscussionLike();
  const commentMutation = useAddDiscussionComment();
  const updateDiscussionMutation = useUpdateMentorDiscussion();
  const deleteDiscussionMutation = useDeleteMentorDiscussion();

  const [commentText, setCommentText] = useState('');
  const listRef = useRef<FlatList>(null);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Realtime subscription for comments
  useEffect(() => {
    if (!discussionId) return;
    const channel = supabase
      .channel(`discussion-comments-${discussionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_discussion_comments',
          filter: `discussion_id=eq.${discussionId}`,
        },
        () => {
          commentsQuery.refetch();
          discussionsQuery.refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [discussionId]);

  useEffect(() => {
    if (comments.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [comments.length]);

  const isAuthor = Boolean(
    myOpportunityId && discussion && discussion.opportunity_id === myOpportunityId,
  );

  const handleLike = () => {
    if (!discussion) return;
    likeMutation.mutate({ discussionId: discussion.id, liked: discussion.user_liked ?? false });
  };

  const handleComment = async () => {
    const text = commentText.trim();
    if (!text || !discussionId || commentMutation.isPending) return;
    setCommentText('');
    await commentMutation.mutateAsync({ discussionId, content: text });
  };

  const handleOpenEdit = () => {
    if (!discussion) return;
    setEditTitle(discussion.title);
    setEditContent(discussion.content);
    setEditModalVisible(true);
  };

  const handleDelete = () => {
    if (!discussion) return;
    Alert.alert(
      'Delete Discussion',
      'Are you sure you want to delete this discussion post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDiscussionMutation.mutateAsync(discussion.id);
              goBack();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete discussion');
            }
          },
        },
      ],
    );
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      Alert.alert('Validation Error', 'Title and content cannot be empty.');
      return;
    }
    if (!discussion) return;

    try {
      setIsSubmittingEdit(true);
      await updateDiscussionMutation.mutateAsync({
        discussion_id: discussion.id,
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setEditModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update discussion');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  if (discussionsQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.root, { backgroundColor: colors.surfaceMuted }]}>
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
              Discussion
            </ThemedText>
          </View>
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </>
    );
  }

  if (!discussion) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.root, { backgroundColor: colors.surfaceMuted }]}>
          <View
            style={[
              styles.header,
              { backgroundColor: colors.background, borderBottomColor: colors.border },
            ]}
          >
            <Pressable onPress={goBack} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <ThemedText themeColor="heading" style={styles.headerTitle}>
              Discussion
            </ThemedText>
          </View>
          <View style={styles.loadingCenter}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <ThemedText themeColor="textMuted" style={{ marginTop: 12, fontSize: 15 }}>
              Discussion not found
            </ThemedText>
          </View>
        </View>
      </>
    );
  }

  const isLiked = discussion.user_liked ?? false;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.surfaceMuted }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
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
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <ThemedText themeColor="heading" style={styles.headerTitle} numberOfLines={1}>
            Discussion
          </ThemedText>

          {isAuthor && (
            <View style={styles.headerAuthorActions}>
              <Pressable
                onPress={handleOpenEdit}
                hitSlop={8}
                style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={handleDelete}
                hitSlop={8}
                style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Scrollable content ──────────────────────────────────────────── */}
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* Discussion post card */}
              <View
                style={[
                  styles.postCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                {/* Author row */}
                <View style={styles.authorRow}>
                  <View style={styles.authorAvatarWrap}>
                    <View
                      style={[styles.authorAvatarFallback, { backgroundColor: tints.indigo.bg }]}
                    >
                      <ThemedText style={[styles.authorInitials, { color: tints.indigo.fg }]}>
                        {initials(discussion.mentor_title)}
                      </ThemedText>
                    </View>
                    {discussion.mentor_image_url ? (
                      <Image
                        source={{ uri: discussion.mentor_image_url }}
                        style={styles.authorAvatarImg}
                        contentFit="cover"
                      />
                    ) : null}
                  </View>

                  <View style={styles.authorMeta}>
                    <View style={styles.authorNameRow}>
                      <ThemedText themeColor="heading" style={styles.authorName} numberOfLines={1}>
                        {discussion.mentor_title}
                      </ThemedText>
                      {discussion.mentor_verified && (
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                      )}
                    </View>
                    <ThemedText
                      themeColor="textSecondary"
                      style={styles.authorRole}
                      numberOfLines={1}
                    >
                      {discussion.mentor_organization}
                    </ThemedText>
                    <ThemedText themeColor="textMuted" style={styles.postTime}>
                      {formatRelative(discussion.created_at)}
                    </ThemedText>
                  </View>
                </View>

                {/* Title & full content */}
                <ThemedText themeColor="heading" style={styles.postTitle}>
                  {discussion.title}
                </ThemedText>
                <ThemedText themeColor="text" style={styles.postBody}>
                  {discussion.content}
                </ThemedText>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Reaction bar */}
                <View style={styles.reactionBar}>
                  <Pressable
                    onPress={handleLike}
                    style={({ pressed }) => [styles.reactionBtn, pressed && { opacity: 0.7 }]}
                    disabled={likeMutation.isPending}
                  >
                    <Ionicons
                      name={isLiked ? 'heart' : 'heart-outline'}
                      size={18}
                      color={isLiked ? '#EF4444' : colors.textMuted}
                    />
                    <ThemedText
                      style={[
                        styles.reactionCount,
                        { color: isLiked ? '#EF4444' : colors.textMuted },
                      ]}
                    >
                      {discussion.likes_count} Like{discussion.likes_count !== 1 ? 's' : ''}
                    </ThemedText>
                  </Pressable>

                  <View style={styles.reactionBtn}>
                    <Ionicons name="chatbubble-outline" size={17} color={colors.textMuted} />
                    <ThemedText themeColor="textSecondary" style={styles.reactionCount}>
                      {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Comments header */}
              <View style={styles.commentsSectionHeader}>
                <ThemedText themeColor="heading" style={styles.commentsSectionTitle}>
                  Comments ({comments.length})
                </ThemedText>
              </View>

              {commentsQuery.isLoading && (
                <View style={styles.commentsLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </>
          }
          renderItem={({ item }) => {
            const isOwnComment = item.user_id === sessionUser?.id;
            return (
              <View
                style={[
                  styles.commentCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.commentAuthorRow}>
                  <View style={[styles.commentAvatar, { backgroundColor: tints.purple.bg }]}>
                    {item.user_avatar_url ? (
                      <Image
                        source={{ uri: item.user_avatar_url }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    ) : (
                      <ThemedText style={[styles.commentInitials, { color: tints.purple.fg }]}>
                        {initials(item.user_full_name ?? 'S')}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.commentMeta}>
                    <View style={styles.commentNameRow}>
                      <ThemedText themeColor="heading" style={styles.commentAuthorName}>
                        {item.user_full_name ?? 'Student'}
                      </ThemedText>
                      {isOwnComment && (
                        <View
                          style={[styles.youBadge, { backgroundColor: tints.indigo.bg }]}
                        >
                          <ThemedText style={[styles.youBadgeText, { color: tints.indigo.fg }]}>
                            You
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText themeColor="textMuted" style={styles.commentTime}>
                      {formatRelative(item.created_at)}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText themeColor="text" style={styles.commentContent}>
                  {item.content}
                </ThemedText>
              </View>
            );
          }}
          ListEmptyComponent={
            !commentsQuery.isLoading ? (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textMuted} />
                <ThemedText themeColor="textMuted" style={styles.emptyCommentsText}>
                  Be the first to comment!
                </ThemedText>
              </View>
            ) : null
          }
        />

        {/* ── Comment Input ────────────────────────────────────────────────── */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Write a comment..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleComment}
          />
          <Pressable
            onPress={handleComment}
            disabled={!commentText.trim() || commentMutation.isPending}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: colors.primary },
              (!commentText.trim() || commentMutation.isPending) && { opacity: 0.4 },
              pressed && { opacity: 0.7 },
            ]}
          >
            {commentMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={17} color="#fff" />
            )}
          </Pressable>
        </View>

        {/* ── Edit Modal ─────────────────────────────────────────────────── */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <ThemedText themeColor="heading" style={styles.modalTitle}>
                  Edit Discussion Post
                </ThemedText>
                <Pressable onPress={() => setEditModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.modalFieldGroup}>
                <ThemedText themeColor="heading" style={styles.modalFieldLabel}>
                  Title *
                </ThemedText>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Discussion title..."
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
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Discussion content..."
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
                  onPress={() => setEditModalVisible(false)}
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                >
                  <ThemedText themeColor="textSecondary" style={styles.modalCancelText}>
                    Cancel
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleSaveEdit}
                  disabled={isSubmittingEdit}
                  style={[
                    styles.modalSaveBtn,
                    { backgroundColor: colors.primary },
                    isSubmittingEdit && { opacity: 0.6 },
                  ]}
                >
                  {isSubmittingEdit ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.modalSaveText}>Save Changes</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: FontFamilies.bold, flex: 1 },
  headerAuthorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    padding: 6,
  },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.three, paddingBottom: 24 },

  // Discussion Post Card
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 12,
    marginBottom: Spacing.three,
    elevation: 1,
    boxShadow: '0px 1px 6px rgba(15,23,42,0.06)',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  authorAvatarFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitials: { fontSize: 14, fontFamily: FontFamilies.semiBold },
  authorAvatarImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  authorMeta: { flex: 1, gap: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  authorName: { fontSize: 14, fontFamily: FontFamilies.semiBold },
  authorRole: { fontSize: 12 },
  postTime: { fontSize: 11 },

  postTitle: { fontSize: 17, fontFamily: FontFamilies.bold, lineHeight: 24 },
  postBody: { fontSize: 14, lineHeight: 22 },

  divider: { height: 1, marginVertical: 2 },

  reactionBar: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  reactionCount: { fontSize: 13, fontFamily: FontFamilies.medium },

  // Comments Section
  commentsSectionHeader: {
    marginBottom: Spacing.two,
    marginTop: 4,
  },
  commentsSectionTitle: { fontSize: 15, fontFamily: FontFamilies.bold },
  commentsLoading: { paddingVertical: 12, alignItems: 'center' },

  commentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 8,
    marginBottom: 8,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  commentInitials: { fontSize: 12, fontFamily: FontFamilies.semiBold },
  commentMeta: { flex: 1 },
  commentNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentAuthorName: { fontSize: 13, fontFamily: FontFamilies.semiBold },
  youBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: { fontSize: 10, fontFamily: FontFamilies.bold },
  commentTime: { fontSize: 11, marginTop: 1 },
  commentContent: { fontSize: 13, lineHeight: 19 },

  emptyComments: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyCommentsText: { fontSize: 13 },

  // Comment input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: FontFamilies.regular,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

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
});
