import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { FontFamilies, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/features/communities/format';
import { initialsOf } from './post-card';
import { ReportSheet } from './report-sheet';
import { useCreateComment, useDeleteComment } from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { confirmDialog } from '@/lib/confirm';
import type { CommunityComment } from '@kse/types';

/**
 * One-level comment thread (spec §Posts): top-level comments render their
 * replies indented; replies cannot be replied to (DB-enforced too).
 */
export function CommentItem({
  comment,
  replies,
  viewerId,
  viewerCanModerate,
  postId,
}: {
  comment: CommunityComment;
  replies: CommunityComment[];
  viewerId: string | null;
  viewerCanModerate: boolean;
  postId: string;
}) {
  const colors = useTheme();
  const tints = useTints();
  const createReply = useCreateComment(postId);
  const deleteComment = useDeleteComment(postId);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const isAuthor = Boolean(viewerId && comment.authorId === viewerId);
  const canDelete = isAuthor || viewerCanModerate;
  const slate = tints.slate;

  const submitReply = () => {
    const text = replyText.trim();
    if (!text) return;
    createReply.mutate(
      { content: text, parentId: comment.id },
      {
        onSuccess: () => {
          setReplyText('');
          setReplying(false);
        },
      },
    );
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Delete comment',
      message: 'The comment will be removed for everyone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) deleteComment.mutate(comment.id);
  };

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: slate.bg, borderColor: slate.border }]}>
          <ThemedText style={[styles.avatarLabel, { color: slate.fg }]}>
            {initialsOf(comment.authorName)}
          </ThemedText>
        </View>
        <View style={styles.bubble}>
          <View style={styles.bubbleHeader}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {comment.authorName}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {formatRelativeTime(comment.createdAt)}
            </ThemedText>
          </View>
          <ThemedText type="small" style={styles.text}>
            {comment.content}
          </ThemedText>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setReplying((v) => !v)}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <ThemedText type="small" themeColor="primary">
                Reply
              </ThemedText>
            </Pressable>
            {!isAuthor && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setReportOpen(true)}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  Report
                </ThemedText>
              </Pressable>
            )}
            {canDelete && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleDelete();
                }}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <ThemedText type="small" themeColor="danger">
                  Delete
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {replying && (
        <View style={styles.replyComposer}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder={`Reply to ${comment.authorName}…`}
            placeholderTextColor={colors.textMuted}
            multiline
            style={[
              styles.replyInput,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
          />
          <View style={styles.replyActions}>
            <PrimaryButton
              label="Cancel"
              variant="outline"
              size="compact"
              onPress={() => {
                setReplying(false);
                setReplyText('');
              }}
            />
            <PrimaryButton
              label={createReply.isPending ? 'Sending…' : 'Reply'}
              size="compact"
              loading={createReply.isPending}
              disabled={!replyText.trim()}
              onPress={submitReply}
            />
          </View>
          {createReply.isError && (
            <ThemedText type="small" themeColor="danger">
              {(createReply.error as Error).message}
            </ThemedText>
          )}
        </View>
      )}

      {replies.length > 0 && (
        <View style={[styles.replies, { borderTopColor: colors.border }]}>
          {replies.map((reply) => (
            <View key={reply.id} style={styles.replyRow}>
              <View
                style={[styles.replyAvatar, { backgroundColor: slate.bg, borderColor: slate.border }]}
              >
                <ThemedText style={[styles.replyAvatarLabel, { color: slate.fg }]}>
                  {initialsOf(reply.authorName)}
                </ThemedText>
              </View>
              <View style={styles.bubble}>
                <View style={styles.bubbleHeader}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {reply.authorName}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {formatRelativeTime(reply.createdAt)}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={styles.text}>
                  {reply.content}
                </ThemedText>
                {(viewerId && reply.authorId === viewerId) || viewerCanModerate ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void confirmDialog({
                        title: 'Delete reply',
                        message: 'The reply will be removed for everyone.',
                        confirmLabel: 'Delete',
                        destructive: true,
                      }).then((ok) => {
                        if (ok) deleteComment.mutate(reply.id);
                      });
                    }}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  >
                    <ThemedText type="small" themeColor="danger">
                      Delete
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <ReportSheet
        visible={reportOpen}
        targetType="community_comment"
        targetId={comment.id}
        onClose={() => setReportOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two - 2,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two - 2,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    lineHeight: 12,
  },
  bubble: {
    flex: 1,
    gap: 2,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two - 2,
  },
  text: {
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
    paddingTop: 2,
  },
  action: {},
  pressed: {
    opacity: 0.7,
  },
  replyComposer: {
    marginLeft: Spacing.four,
    gap: Spacing.one + 2,
  },
  replyInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.two - 2,
    minHeight: 56,
    textAlignVertical: 'top',
    fontFamily: FontFamilies.regular,
    fontSize: 12,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.one + 2,
  },
  replies: {
    marginLeft: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
    // borderTopColor: colors.border — applied at the call site because the
    // theme token isn't reachable from a module-level StyleSheet.
    paddingTop: Spacing.two - 2,
    gap: Spacing.two - 2,
  },
  replyRow: {
    flexDirection: 'row',
    gap: Spacing.two - 2,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyAvatarLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    lineHeight: 11,
  },
});
