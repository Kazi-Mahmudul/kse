import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useMentors, useMyConversations } from '@/features/mentorship/queries';
import type { MentorConversationSummary, MentorSummary } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function formatChatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MentorConversationsScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship');

  const { data: conversations, isLoading, refetch, isRefetching } = useMyConversations();
  const { data: mentors } = useMentors();

  const [search, setSearch] = useState('');

  const filteredConversations = (conversations ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.mentor_title.toLowerCase().includes(q) ||
      c.mentor_organization.toLowerCase().includes(q) ||
      c.last_message.toLowerCase().includes(q)
    );
  });

  const featuredMentors = (mentors ?? []).slice(0, 6);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <ThemedText themeColor="heading" style={styles.headerTitle}>
              Mentor Messages
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.headerSubtitle}>
              Direct 1-on-1 mentorship discussions
            </ThemedText>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search conversations & mentors..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.opportunity_id}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              filteredConversations.length > 0 ? (
                <View style={styles.sectionHeader}>
                  <ThemedText themeColor="textSecondary" style={styles.sectionTitle}>
                    RECENT CONVERSATIONS ({filteredConversations.length})
                  </ThemedText>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/explore/mentorship/chat/[id]',
                    params: { id: item.opportunity_id },
                  })
                }
                style={({ pressed }) => [
                  styles.conversationItem,
                  { borderBottomColor: colors.border },
                  pressed && { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <View style={styles.avatarWrap}>
                  <View
                    style={[styles.avatarFallback, { backgroundColor: tints.indigo.bg }]}
                  >
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
                  <View style={[styles.onlineDot, { borderColor: colors.background }]} />
                </View>

                <View style={styles.convDetails}>
                  <View style={styles.convHeaderRow}>
                    <ThemedText
                      themeColor="heading"
                      style={styles.convName}
                      numberOfLines={1}
                    >
                      {item.mentor_title}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.convDate}>
                      {formatChatDate(item.last_message_at)}
                    </ThemedText>
                  </View>

                  {item.mentor_organization ? (
                    <ThemedText
                      themeColor="textSecondary"
                      style={styles.convOrg}
                      numberOfLines={1}
                    >
                      {item.mentor_organization}
                    </ThemedText>
                  ) : null}

                  <View style={styles.lastMsgRow}>
                    <ThemedText
                      themeColor={item.unread_count > 0 ? 'heading' : 'textSecondary'}
                      style={[
                        styles.lastMsgText,
                        item.unread_count > 0 && styles.lastMsgUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.last_message}
                    </ThemedText>
                    {item.unread_count > 0 ? (
                      <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                        <ThemedText style={styles.unreadText}>
                          {item.unread_count}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: tints.indigo.bg },
                  ]}
                >
                  <Ionicons name="chatbubbles-outline" size={36} color={tints.indigo.fg} />
                </View>
                <ThemedText themeColor="heading" style={styles.emptyTitle}>
                  {search ? 'No matching conversations' : 'No active chats yet'}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emptyDesc}>
                  {search
                    ? 'Try searching with a different mentor name or keyword'
                    : 'Reach out to experienced mentors for career, research, or higher-study guidance.'}
                </ThemedText>

                {/* Quick Start Mentors List */}
                <View style={styles.quickStartWrap}>
                  <ThemedText themeColor="heading" style={styles.quickStartTitle}>
                    Start a conversation with a mentor:
                  </ThemedText>

                  <View style={styles.quickMentorList}>
                    {featuredMentors.map((m: MentorSummary) => (
                      <Pressable
                        key={m.id}
                        onPress={() =>
                          router.push({
                            pathname: '/(tabs)/explore/mentorship/chat/[id]',
                            params: { id: m.id },
                          })
                        }
                        style={({ pressed }) => [
                          styles.quickMentorCard,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.border,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <View style={styles.quickAvatarWrap}>
                          <View
                            style={[
                              styles.quickAvatarFallback,
                              { backgroundColor: tints.indigo.bg },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.quickAvatarInitials,
                                { color: tints.indigo.fg },
                              ]}
                            >
                              {initials(m.title)}
                            </ThemedText>
                          </View>
                          {m.image_url ? (
                            <Image
                              source={{ uri: m.image_url }}
                              style={styles.quickAvatarImage}
                              contentFit="cover"
                            />
                          ) : null}
                        </View>
                        <View style={styles.quickMeta}>
                          <ThemedText
                            themeColor="heading"
                            style={styles.quickName}
                            numberOfLines={1}
                          >
                            {m.title}
                          </ThemedText>
                          <ThemedText
                            themeColor="textSecondary"
                            style={styles.quickOrg}
                            numberOfLines={1}
                          >
                            {m.organization_name}
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.quickChatBtn,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Ionicons name="chatbubble-ellipses" size={14} color="#fff" />
                          <ThemedText style={styles.quickChatBtnText}>Chat</ThemedText>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
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
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  headerSubtitle: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  searchSection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: Spacing.six,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  sectionTitle: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
  },
  avatarImage: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
  convDetails: {
    flex: 1,
  },
  convHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  convName: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
    flex: 1,
  },
  convDate: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
  },
  convOrg: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    marginTop: 1,
  },
  lastMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    gap: 8,
  },
  lastMsgText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    flex: 1,
  },
  lastMsgUnread: {
    fontFamily: FontFamilies.semiBold,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontFamily: FontFamilies.bold,
    fontSize: 11,
  },
  emptyContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 17,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 280,
  },
  quickStartWrap: {
    width: '100%',
    marginTop: Spacing.six,
  },
  quickStartTitle: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 14,
    marginBottom: Spacing.three,
  },
  quickMentorList: {
    gap: 10,
  },
  quickMentorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  quickAvatarWrap: {
    width: 40,
    height: 40,
    position: 'relative',
  },
  quickAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAvatarInitials: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
  },
  quickAvatarImage: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
  },
  quickMeta: {
    flex: 1,
  },
  quickName: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 14,
  },
  quickOrg: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    marginTop: 1,
  },
  quickChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  quickChatBtnText: {
    color: '#fff',
    fontFamily: FontFamilies.medium,
    fontSize: 12,
  },
});
