import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useMentor, useMentorMessages, useSendMentorMessage } from '@/features/mentorship/queries';
import type { MentorMessage } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Screen 7: Chat with Mentor (reference `7._chat_with_mentor`)
 *
 * - Header: back, mentor avatar + name + "Online · Usually replies in minutes"
 * - Message list: left-aligned mentor messages (grey bubble), right-aligned user messages (primary)
 * - Supabase Realtime subscription for live updates
 * - Bottom: attachment icon, text input, send button
 */
export default function MentorChatScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship');
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionUser = useAuthStore((s) => s.session?.user);

  const mentorQuery = useMentor(id);
  const mentor = mentorQuery.data;

  const messagesQuery = useMentorMessages(id);
  const sendMutation = useSendMentorMessage();

  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if ((messagesQuery.data?.length ?? 0) > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messagesQuery.data?.length]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`mentor-chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mentor_messages',
          filter: `opportunity_id=eq.${id}`,
        },
        () => {
          messagesQuery.refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !id || sendMutation.isPending) return;
    setInput('');
    await sendMutation.mutateAsync({ opportunityId: id, content: text });
  };

  const messages: MentorMessage[] = messagesQuery.data ?? [];

  // ── Introductory greeting from the mentor (static, displayed above real messages) ──
  const greeting = mentor
    ? {
        id: '__greeting__',
        content: `Hello! 👋\nHow can I help you today?`,
        sender_id: '__mentor__',
        created_at: new Date(mentor.published_at ?? '2025-01-01').toISOString(),
      }
    : null;

  const allItems = greeting
    ? [greeting, ...messages]
    : messages;

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
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          {/* Mentor avatar */}
          <View style={styles.headerAvatarWrap}>
            <View style={[styles.headerAvatarFallback, { backgroundColor: tints.indigo.bg }]}>
              <ThemedText style={[styles.headerAvatarInitials, { color: tints.indigo.fg }]}>
                {mentor ? initials(mentor.title) : 'M'}
              </ThemedText>
            </View>
            {mentor?.image_url ? (
              <Image
                source={{ uri: mentor.image_url }}
                style={styles.headerAvatarImage}
                contentFit="cover"
              />
            ) : null}
            {/* Online dot */}
            <View style={[styles.onlineDot, { borderColor: colors.background }]} />
          </View>

          <View style={styles.headerMeta}>
            <ThemedText
              themeColor="heading"
              style={styles.headerName}
              numberOfLines={1}
            >
              {mentor?.title ?? 'Mentor'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.headerStatus}>
              <ThemedText style={{ color: '#22C55E', fontSize: 10 }}>● </ThemedText>
              Online · Usually replies in minutes
            </ThemedText>
          </View>

          <Pressable hitSlop={10} style={styles.moreBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* ── Messages ────────────────────────────────────────────────────── */}
        {messagesQuery.isLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={allItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isOwnMessage =
                item.sender_id !== '__mentor__' &&
                item.sender_id === sessionUser?.id;
              const isMentorGreeting = item.sender_id === '__mentor__';

              if (isOwnMessage) {
                // User bubble — right-aligned, primary color
                return (
                  <View style={styles.userBubbleRow}>
                    <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
                      <ThemedText style={styles.userBubbleText}>
                        {item.content}
                      </ThemedText>
                    </View>
                    <ThemedText
                      themeColor="textSecondary"
                      style={[styles.timestamp, styles.timestampRight]}
                    >
                      {formatTime(item.created_at)}{' '}
                      <Ionicons name="checkmark-done" size={11} color={colors.primary} />
                    </ThemedText>
                  </View>
                );
              }

              // Mentor bubble — left-aligned, card background
              return (
                <View style={styles.mentorBubbleRow}>
                  {isMentorGreeting && mentor && (
                    <View style={[styles.inlineMentorAvatar, { backgroundColor: tints.indigo.bg }]}>
                      <ThemedText style={[styles.inlineInitials, { color: tints.indigo.fg }]}>
                        {initials(mentor.title)}
                      </ThemedText>
                    </View>
                  )}
                  <View>
                    <View
                      style={[
                        styles.mentorBubble,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <ThemedText themeColor="text" style={styles.mentorBubbleText}>
                        {item.content}
                      </ThemedText>
                    </View>
                    <ThemedText themeColor="textSecondary" style={styles.timestamp}>
                      {formatTime(item.created_at)}
                    </ThemedText>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* ── Input bar ───────────────────────────────────────────────────── */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Pressable hitSlop={8} style={styles.attachBtn}>
            <Ionicons name="attach" size={22} color={colors.textMuted} />
          </Pressable>

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
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
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />

          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: colors.primary },
              (!input.trim() || sendMutation.isPending) && { opacity: 0.5 },
              pressed && { opacity: 0.8 },
            ]}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    gap: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'visible',
    position: 'relative',
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitials: {
    fontSize: 14,
    fontFamily: FontFamilies.semiBold,
  },
  headerAvatarImage: {
    position: 'absolute',
    top: 0, left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
  headerMeta: {
    flex: 1,
    gap: 1,
  },
  headerName: {
    fontSize: 14,
    fontFamily: FontFamilies.semiBold,
  },
  headerStatus: {
    fontSize: 11,
    fontFamily: FontFamilies.regular,
  },
  moreBtn: {
    padding: 4,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    padding: Spacing.three,
    gap: 12,
    paddingBottom: 16,
  },

  // Mentor bubble
  mentorBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '82%',
    alignSelf: 'flex-start',
  },
  inlineMentorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inlineInitials: {
    fontSize: 11,
    fontFamily: FontFamilies.semiBold,
  },
  mentorBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    maxWidth: 280,
  },
  mentorBubbleText: {
    fontSize: 14,
    fontFamily: FontFamilies.regular,
    lineHeight: 20,
  },

  // User bubble
  userBubbleRow: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    maxWidth: '82%',
  },
  userBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 280,
  },
  userBubbleText: {
    fontSize: 14,
    fontFamily: FontFamilies.regular,
    lineHeight: 20,
    color: '#ffffff',
  },

  timestamp: {
    fontSize: 10,
    fontFamily: FontFamilies.regular,
    marginTop: 3,
    marginHorizontal: 4,
  },
  timestampRight: {
    alignSelf: 'flex-end',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
  },
  attachBtn: {
    padding: 4,
    paddingBottom: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
});
