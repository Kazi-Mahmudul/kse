import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
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
  useMentorPortalSessions,
  useMyMentorApplication,
  useMyMentorQuestions,
  useUpdateMentorDiscussion,
  useUpdateMentorSessionStatus,
} from '@/features/mentorship/queries';
import type { MentorApplication, MentorDiscussion, MentorSession } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { supabase } from '@/lib/supabase';

type PortalTab = 'sessions' | 'messages' | 'questions' | 'discussions';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
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

function statusLabel(status: MentorSession['status']): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'confirmed': return 'Confirmed';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
  }
}

/**
 * Mentor Portal — accessible only to users with an approved mentor_application.
 * Shows tabs: Sessions booked by students, Student Messages, Student Questions, Discussions.
 */
export default function MentorPortalScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship' as any);

  const [tab, setTab] = useState<PortalTab>('sessions');

  const applicationQuery = useMyMentorApplication();
  const application = applicationQuery.data as MentorApplication | null | undefined;

  const sessionsQuery = useMentorPortalSessions();
  const questionsQuery = useMyMentorQuestions();
  const discussionsQuery = useMentorDiscussions();

  const sessions: MentorSession[] = (sessionsQuery.data as MentorSession[] | undefined) ?? [];
  const questions = questionsQuery.data ?? [];
  const allDiscussions: MentorDiscussion[] = discussionsQuery.data ?? [];

  const updateSessionMutation = useUpdateMentorSessionStatus();
  const createDiscussionMutation = useCreateMentorDiscussion();
  const updateDiscussionMutation = useUpdateMentorDiscussion();
  const deleteDiscussionMutation = useDeleteMentorDiscussion();

  const opportunityId = application?.opportunity_id;
  const myDiscussions = allDiscussions.filter((d) => d.opportunity_id === opportunityId);

  // Discussion create / edit modal state
  const [discussionModalVisible, setDiscussionModalVisible] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState<MentorDiscussion | null>(null);
  const [discTitle, setDiscTitle] = useState('');
  const [discContent, setDiscContent] = useState('');
  const [isSubmittingDisc, setIsSubmittingDisc] = useState(false);

  // Realtime for chat messages
  useEffect(() => {
    if (!opportunityId) return;
    const channel = supabase
      .channel(`mentor-portal-chat-${opportunityId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mentor_messages', filter: `opportunity_id=eq.${opportunityId}` },
        () => { /* Refetch handled by queries */ },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [opportunityId]);

  if (applicationQuery.isPending) {
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

  if (!application || application.status !== 'approved') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.root, { backgroundColor: colors.surfaceMuted }]}>
          <Header goBack={goBack} colors={colors} />
          <View style={styles.loadingCenter}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
            <ThemedText themeColor="heading" style={styles.accessDeniedTitle}>
              Mentor Portal
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.accessDeniedText}>
              Your mentor application must be approved to access this portal.
            </ThemedText>
            <Pressable
              onPress={() => router.push('/(tabs)/profile/become-mentor' as any)}
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
            >
              <ThemedText style={styles.applyBtnText}>View Application Status</ThemedText>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  const TABS: { key: PortalTab; label: string; icon: string }[] = [
    { key: 'sessions', label: 'Bookings', icon: 'calendar-outline' },
    { key: 'messages', label: 'Messages', icon: 'chatbubble-outline' },
    { key: 'questions', label: 'Questions', icon: 'help-circle-outline' },
    { key: 'discussions', label: 'Discussions', icon: 'newspaper-outline' },
  ];

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
    if (!opportunityId) {
      Alert.alert('Error', 'Mentor profile ID not found.');
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
          opportunity_id: opportunityId,
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

  const handleUpdateSession = async (sessionId: string, newStatus: 'confirmed' | 'rejected' | 'completed' | 'cancelled') => {
    try {
      await updateSessionMutation.mutateAsync({ sessionId, status: newStatus });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update session status');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: colors.surfaceMuted }]}>
        {/* Header */}
        <Header
          goBack={goBack}
          colors={colors}
          verified
          onEditProfile={() => router.push('/(tabs)/explore/mentorship/edit-profile' as any)}
        />

        {/* Mentor identity strip */}
        <View style={[styles.mentorStrip, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={[styles.mentorStripAvatar, { backgroundColor: tints.indigo.bg }]}>
            {application.avatar_url ? (
              <Image source={{ uri: application.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <ThemedText style={[styles.mentorStripInitials, { color: tints.indigo.fg }]}>
                {initials(application.full_name)}
              </ThemedText>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText themeColor="heading" style={styles.mentorStripName}>
              {application.full_name}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.mentorStripRole} numberOfLines={1}>
              {application.designation} · {application.organization}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/explore/mentorship/edit-profile' as any)}
            style={({ pressed }) => [
              styles.editProfileBtn,
              { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="create-outline" size={13} color={colors.primary} />
            <ThemedText style={[styles.editProfileBtnText, { color: colors.primary }]}>
              Edit Profile
            </ThemedText>
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {TABS.map(({ key, label, icon }) => {
            const isActive = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[
                  styles.tabItem,
                  isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
              >
                <Ionicons
                  name={icon as any}
                  size={16}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <ThemedText
                  style={[
                    styles.tabLabel,
                    { color: isActive ? colors.primary : colors.textMuted },
                    isActive && { fontFamily: FontFamilies.semiBold },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* ── Sessions / Bookings Tab ─────────────────────────────────────── */}
        {tab === 'sessions' && (
          <FlatList
            data={sessions}
            keyExtractor={(s) => s.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={sessionsQuery.isRefetching ?? false}
                onRefresh={() => sessionsQuery.refetch?.()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => {
              const sc = item.status === 'confirmed'
                ? tints.emerald
                : item.status === 'cancelled'
                  ? { bg: '#FEF2F2', border: '#FEE2E2', fg: '#EF4444' }
                  : item.status === 'completed'
                    ? tints.slate
                    : tints.amber;

              return (
                <View style={[styles.sessionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.sessionHeader}>
                    <View style={[styles.studentAvatar, { backgroundColor: tints.purple.bg }]}>
                      {item.mentor_image_url ? (
                        <Image source={{ uri: item.mentor_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <ThemedText style={[styles.studentInitials, { color: tints.purple.fg }]}>
                          {initials(item.mentor_title)}
                        </ThemedText>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText themeColor="heading" style={styles.studentName}>
                        {item.mentor_title}
                      </ThemedText>
                      <ThemedText themeColor="textMuted" style={styles.sessionTime}>
                        Booked {formatRelative(item.created_at)}
                      </ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <ThemedText style={[styles.statusBadgeText, { color: sc.fg }]}>
                        {statusLabel(item.status)}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.sessionDivider, { backgroundColor: colors.border }]} />

                  <ThemedText themeColor="heading" style={styles.sessionTopic}>
                    {item.topic}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.sessionMessage} numberOfLines={3}>
                    {item.message}
                  </ThemedText>

                  <View style={styles.sessionMeta}>
                    <View style={styles.sessionMetaItem}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                      <ThemedText themeColor="textMuted" style={styles.sessionMetaText}>
                        {item.preferred_date ?? 'Date TBD'}
                        {item.preferred_time ? ` · ${item.preferred_time}` : ''}
                      </ThemedText>
                    </View>
                    <View style={styles.sessionMetaItem}>
                      <Ionicons
                        name={item.session_mode === 'online' ? 'videocam-outline' : 'location-outline'}
                        size={13}
                        color={colors.textMuted}
                      />
                      <ThemedText themeColor="textMuted" style={styles.sessionMetaText}>
                        {item.session_mode}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Actions for session status */}
                  {item.status === 'pending' && (
                    <View style={styles.sessionActionRow}>
                      <Pressable
                        onPress={() => handleUpdateSession(item.id, 'confirmed')}
                        disabled={updateSessionMutation.isPending}
                        style={({ pressed }) => [
                          styles.actionPillBtn,
                          { backgroundColor: tints.emerald.bg, borderColor: tints.emerald.border },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color={tints.emerald.fg} />
                        <ThemedText style={[styles.actionPillBtnText, { color: tints.emerald.fg }]}>
                          Accept Booking
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        onPress={() => handleUpdateSession(item.id, 'rejected')}
                        disabled={updateSessionMutation.isPending}
                        style={({ pressed }) => [
                          styles.actionPillBtn,
                          { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                        <ThemedText style={[styles.actionPillBtnText, { color: '#EF4444' }]}>
                          Decline
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}

                  {item.status === 'confirmed' && (
                    <View style={styles.sessionActionRow}>
                      <Pressable
                        onPress={() => handleUpdateSession(item.id, 'completed')}
                        disabled={updateSessionMutation.isPending}
                        style={({ pressed }) => [
                          styles.actionPillBtn,
                          { backgroundColor: tints.indigo.bg, borderColor: tints.indigo.border },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Ionicons name="ribbon-outline" size={14} color={tints.indigo.fg} />
                        <ThemedText style={[styles.actionPillBtnText, { color: tints.indigo.fg }]}>
                          Mark Completed
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}

                  {/* Chat with student */}
                  {opportunityId && (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/explore/mentorship/chat/[id]' as any,
                          params: { id: opportunityId },
                        })
                      }
                      style={({ pressed }) => [
                        styles.replyBtn,
                        { backgroundColor: colors.primary },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Ionicons name="chatbubble-outline" size={14} color="#fff" />
                      <ThemedText style={styles.replyBtnText}>Reply via Chat</ThemedText>
                    </Pressable>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={42} color={colors.textMuted} />
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  No session bookings yet.{'\n'}Students will appear here when they book with you.
                </ThemedText>
              </View>
            }
          />
        )}

        {/* ── Messages Tab ─────────────────────────────────────────────────── */}
        {tab === 'messages' && opportunityId && (
          <View style={styles.fullWidthCenter}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.primary} style={{ marginBottom: 12 }} />
            <ThemedText themeColor="heading" style={styles.messageTabTitle}>
              Student Messages
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.messageTabDesc}>
              Students send you messages through your mentor chat thread. Tap below to open it.
            </ThemedText>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/explore/mentorship/chat/[id]' as any,
                  params: { id: opportunityId },
                })
              }
              style={({ pressed }) => [
                styles.openChatBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <ThemedText style={styles.openChatBtnText}>Open Chat Thread</ThemedText>
            </Pressable>
          </View>
        )}

        {/* ── Questions Tab ────────────────────────────────────────────────── */}
        {tab === 'questions' && (
          <FlatList
            data={questions}
            keyExtractor={(q) => q.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={questionsQuery.isRefetching}
                onRefresh={() => questionsQuery.refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <View style={[styles.questionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.categoryBadge, { backgroundColor: tints.indigo.bg }]}>
                  <ThemedText style={[styles.categoryBadgeText, { color: tints.indigo.fg }]}>
                    {item.category}
                  </ThemedText>
                </View>
                <ThemedText themeColor="text" style={styles.questionText}>
                  {item.question}
                </ThemedText>
                <ThemedText themeColor="textMuted" style={styles.questionTime}>
                  {formatRelative(item.created_at)}
                </ThemedText>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="help-circle-outline" size={42} color={colors.textMuted} />
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  No student questions yet.
                </ThemedText>
              </View>
            }
          />
        )}

        {/* ── Discussions Tab ──────────────────────────────────────────────── */}
        {tab === 'discussions' && (
          <FlatList
            data={myDiscussions}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={discussionsQuery.isRefetching}
                onRefresh={() => discussionsQuery.refetch()}
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={
              <View style={styles.discussionsHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText themeColor="heading" style={styles.discussionsHeaderTitle}>
                    Your Discussion Posts
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.discussionsHeaderSub}>
                    Share knowledge, advice, and tips with students across the platform.
                  </ThemedText>
                </View>
                <Pressable
                  onPress={handleOpenCreateDiscussion}
                  style={({ pressed }) => [
                    styles.createDiscBtn,
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <ThemedText style={styles.createDiscBtnText}>New Post</ThemedText>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.discCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.discCardHeader}>
                  <ThemedText themeColor="heading" style={styles.discTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                  <ThemedText themeColor="textMuted" style={styles.discTime}>
                    {formatRelative(item.created_at)}
                  </ThemedText>
                </View>

                <ThemedText themeColor="textSecondary" style={styles.discBody} numberOfLines={3}>
                  {item.content}
                </ThemedText>

                <View style={[styles.discDivider, { backgroundColor: colors.border }]} />

                <View style={styles.discFooter}>
                  <View style={styles.discStatsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
                      <ThemedText themeColor="textMuted" style={styles.statText}>
                        {item.likes_count}
                      </ThemedText>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
                      <ThemedText themeColor="textMuted" style={styles.statText}>
                        {item.comments_count}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.discActionsRow}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/explore/mentorship/discussion' as any,
                          params: { discussionId: item.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.discActionBtn,
                        { backgroundColor: tints.indigo.bg },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="eye-outline" size={13} color={tints.indigo.fg} />
                      <ThemedText style={[styles.discActionBtnText, { color: tints.indigo.fg }]}>
                        View
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => handleOpenEditDiscussion(item)}
                      style={({ pressed }) => [
                        styles.discActionBtn,
                        { backgroundColor: tints.slate.bg },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="create-outline" size={13} color={colors.text} />
                      <ThemedText style={[styles.discActionBtnText, { color: colors.text }]}>
                        Edit
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDeleteDiscussion(item.id)}
                      style={({ pressed }) => [
                        styles.discActionBtn,
                        { backgroundColor: '#FEF2F2' },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={13} color="#EF4444" />
                      <ThemedText style={[styles.discActionBtnText, { color: '#EF4444' }]}>
                        Delete
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="newspaper-outline" size={42} color={colors.textMuted} />
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  You haven't posted any discussions yet.{'\n'}Tap "+ New Post" to start a discussion.
                </ThemedText>
              </View>
            }
          />
        )}

        {/* ── Modal to Create / Edit Discussion ────────────────────────────── */}
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

function Header({
  goBack,
  colors,
  verified,
  onEditProfile,
}: {
  goBack: () => void;
  colors: ReturnType<typeof useTheme>;
  verified?: boolean;
  onEditProfile?: () => void;
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
        Mentor Portal
      </ThemedText>
      {verified && (
        <Ionicons name="shield-checkmark" size={18} color="#10B981" />
      )}
      {onEditProfile && (
        <Pressable
          onPress={onEditProfile}
          hitSlop={8}
          style={({ pressed }) => [styles.headerEditBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </Pressable>
      )}
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
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: FontFamilies.bold, flex: 1 },
  headerEditBtn: { padding: 4 },

  mentorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.three,
    borderBottomWidth: 1,
  },
  mentorStripAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mentorStripInitials: { fontSize: 15, fontFamily: FontFamilies.semiBold },
  mentorStripName: { fontSize: 15, fontFamily: FontFamilies.bold },
  mentorStripRole: { fontSize: 12 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontFamily: FontFamilies.semiBold,
  },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 11, fontFamily: FontFamilies.medium },

  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: Spacing.four,
  },
  accessDeniedTitle: { fontSize: 18, fontFamily: FontFamilies.bold },
  accessDeniedText: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  applyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  applyBtnText: { color: '#fff', fontSize: 14, fontFamily: FontFamilies.semiBold },

  listContent: { padding: Spacing.three, gap: 12, paddingBottom: 40 },

  // Session card
  sessionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 10,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  studentInitials: { fontSize: 13, fontFamily: FontFamilies.semiBold },
  studentName: { fontSize: 14, fontFamily: FontFamilies.semiBold },
  sessionTime: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontFamily: FontFamilies.semiBold },
  sessionDivider: { height: 1 },
  sessionTopic: { fontSize: 14, fontFamily: FontFamilies.semiBold },
  sessionMessage: { fontSize: 13, lineHeight: 19 },
  sessionMeta: { flexDirection: 'row', gap: 14 },
  sessionMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sessionMetaText: { fontSize: 12 },
  sessionActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionPillBtnText: {
    fontSize: 12,
    fontFamily: FontFamilies.semiBold,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  replyBtnText: { color: '#fff', fontSize: 13, fontFamily: FontFamilies.semiBold },

  // Questions
  questionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 8,
  },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryBadgeText: { fontSize: 11, fontFamily: FontFamilies.medium },
  questionText: { fontSize: 14, lineHeight: 20 },
  questionTime: { fontSize: 11 },

  // Discussions
  discussionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  discussionsHeaderTitle: {
    fontSize: 16,
    fontFamily: FontFamilies.bold,
  },
  discussionsHeaderSub: {
    fontSize: 12,
    marginTop: 2,
  },
  createDiscBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createDiscBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: FontFamilies.bold,
  },
  discCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 8,
  },
  discCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  discTitle: {
    fontSize: 14,
    fontFamily: FontFamilies.bold,
    flex: 1,
  },
  discTime: {
    fontSize: 11,
  },
  discBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  discDivider: {
    height: 1,
    marginVertical: 4,
  },
  discFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: FontFamilies.medium,
  },
  discActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discActionBtnText: {
    fontSize: 11,
    fontFamily: FontFamilies.medium,
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

  // Full width center
  fullWidthCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: 12,
  },
  messageTabTitle: { fontSize: 18, fontFamily: FontFamilies.bold },
  messageTabDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  openChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  openChatBtnText: { color: '#fff', fontSize: 14, fontFamily: FontFamilies.semiBold },

  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
