import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useMyMentorQuestions,
  useSubmitMentorQuestion,
} from '@/features/mentorship/queries';
import type { MentorQuestion } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

const MAX_CHARS = 500;

const QUESTION_CATEGORIES = [
  'General Guidance',
  'Career Development',
  'Scholarship & Funding',
  'Research & Publication',
  'Study Abroad',
  'Tech & Software',
  'Business & Entrepreneurship',
  'Academic Support',
];

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Screen 9: Ask a Question (Free) — reference `9._ask_a_question_free`
 *
 * Two tabs:
 * - "Ask a Question" — text area (500 chars), category picker, Send Question CTA
 * - "My Questions"   — list of previously submitted questions with status + answer
 */
export default function AskQuestionScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship');

  const [activeTab, setActiveTab] = useState<'ask' | 'mine'>('ask');
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('General Guidance');
  const [showCategories, setShowCategories] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const myQuestionsQuery = useMyMentorQuestions();
  const submitMutation = useSubmitMentorQuestion();

  const handleSubmit = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      Alert.alert('Empty question', 'Please write your question before submitting.');
      return;
    }
    try {
      await submitMutation.mutateAsync({ question: trimmed, category });
      setSubmitted(true);
      setQuestion('');
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message ?? 'Please try again.');
    }
  };

  const handleAskAnother = () => {
    setSubmitted(false);
    setActiveTab('ask');
  };

  const myQuestions: MentorQuestion[] = myQuestionsQuery.data ?? [];

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
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <ThemedText themeColor="heading" style={styles.headerTitle}>
            Ask a Question (Free)
          </ThemedText>
        </View>

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <View
          style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
        >
          {(['ask', 'mine'] as const).map((t) => {
            const isActive = activeTab === t;
            const label = t === 'ask' ? 'Ask a Question' : 'My Questions';
            return (
              <Pressable
                key={t}
                onPress={() => setActiveTab(t)}
                style={styles.tabItem}
              >
                <ThemedText
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.primary : colors.textMuted,
                      fontFamily: isActive ? FontFamilies.semiBold : FontFamilies.regular,
                    },
                  ]}
                >
                  {label}
                </ThemedText>
                {isActive && (
                  <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ── Ask a Question tab ───────────────────────────────────────────── */}
        {activeTab === 'ask' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.askContent}
            keyboardShouldPersistTaps="handled"
          >
            {submitted ? (
              /* Success state */
              <View style={styles.successContainer}>
                <View style={[styles.successIcon, { backgroundColor: tints.emerald.bg }]}>
                  <Ionicons name="checkmark-circle" size={48} color={tints.emerald.fg} />
                </View>
                <ThemedText themeColor="heading" style={styles.successTitle}>
                  Question Submitted!
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.successSubtitle}>
                  {'Our mentors will review your question and respond soon. You can view your questions in the "My Questions" tab.'}
                </ThemedText>
                <PrimaryButton
                  label="View My Questions"
                  onPress={() => { setSubmitted(false); setActiveTab('mine'); }}
                  style={styles.successBtn}
                />
                <PrimaryButton
                  label="Ask Another Question"
                  variant="outline"
                  onPress={handleAskAnother}
                  style={styles.successBtnOutline}
                />
              </View>
            ) : (
              <>
                {/* Promo header */}
                <View style={styles.promoBox}>
                  <View style={[styles.promoIconWrap, { backgroundColor: tints.indigo.bg }]}>
                    <Ionicons name="chatbubble-ellipses" size={28} color={tints.indigo.fg} />
                  </View>
                  <ThemedText themeColor="heading" style={styles.promoTitle}>
                    Have a quick question?
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.promoSubtitle}>
                    Ask for free and get guidance from our mentors.
                  </ThemedText>
                </View>

                {/* Text area */}
                <View
                  style={[
                    styles.textAreaWrap,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <TextInput
                    value={question}
                    onChangeText={(t) => setQuestion(t.slice(0, MAX_CHARS))}
                placeholder={
                  'Write your question here...\n(e.g. Scholarship requirements, research ideas, university selection, etc.)'
                }
                    placeholderTextColor={colors.textMuted}
                    multiline
                    style={[
                      styles.textArea,
                      { color: colors.text },
                    ]}
                    textAlignVertical="top"
                  />
                  <View style={styles.charCountRow}>
                    <ThemedText themeColor="textSecondary" style={styles.charHint}>
                      Max {MAX_CHARS} characters
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.charCount,
                        {
                          color: question.length >= MAX_CHARS
                            ? colors.danger
                            : colors.textMuted,
                        },
                      ]}
                    >
                      {question.length}/{MAX_CHARS}
                    </ThemedText>
                  </View>
                </View>

                {/* Category picker */}
                <ThemedText themeColor="heading" style={styles.categoryLabel}>
                  Select Category
                </ThemedText>

                <Pressable
                  onPress={() => setShowCategories(!showCategories)}
                  style={[
                    styles.categoryPicker,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <ThemedText themeColor="text" style={styles.categoryPickerText}>
                    {category}
                  </ThemedText>
                  <Ionicons
                    name={showCategories ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </Pressable>

                {showCategories && (
                  <View
                    style={[
                      styles.categoryDropdown,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    {QUESTION_CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => { setCategory(cat); setShowCategories(false); }}
                        style={({ pressed }) => [
                          styles.categoryItem,
                          { borderBottomColor: colors.border },
                          pressed && { backgroundColor: colors.surfaceMuted },
                          category === cat && { backgroundColor: `${colors.primary}0A` },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.categoryItemText,
                            category === cat && { color: colors.primary, fontFamily: FontFamilies.semiBold },
                          ]}
                        >
                          {cat}
                        </ThemedText>
                        {category === cat && (
                          <Ionicons name="checkmark" size={16} color={colors.primary} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={{ height: 120 }} />
              </>
            )}
          </ScrollView>
        )}

        {/* ── My Questions tab ─────────────────────────────────────────────── */}
        {activeTab === 'mine' && (
          myQuestionsQuery.isLoading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={myQuestions}
              keyExtractor={(q) => q.id}
              contentContainerStyle={styles.myQListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="help-circle-outline" size={48} color={colors.textMuted} />
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                    {'You haven\'t asked any questions yet.\nTap "Ask a Question" to get started.'}
                  </ThemedText>
                  <PrimaryButton
                    label="Ask a Question"
                    onPress={() => setActiveTab('ask')}
                    style={styles.emptyBtn}
                    size="compact"
                  />
                </View>
              }
              renderItem={({ item }) => (
                <QuestionCard item={item} />
              )}
            />
          )
        )}

        {/* ── Sticky CTA for Ask tab ────────────────────────────────────────── */}
        {activeTab === 'ask' && !submitted && (
          <View
            style={[
              styles.bottomBar,
              { backgroundColor: colors.background, borderTopColor: colors.border },
            ]}
          >
            <PrimaryButton
              label="Send Question"
              loading={submitMutation.isPending}
              disabled={!question.trim()}
              onPress={handleSubmit}
            />
          </View>
        )}
      </View>
    </>
  );
}

// ── QuestionCard sub-component ────────────────────────────────────────────

function QuestionCard({ item }: { item: MentorQuestion }) {
  const colors = useTheme();
  const tints = useTints();

  const statusColors: Record<string, { bg: string; fg: string }> = {
    pending: { bg: tints.amber.bg, fg: tints.amber.fg },
    answered: { bg: tints.emerald.bg, fg: tints.emerald.fg },
    closed: { bg: tints.slate.bg, fg: tints.slate.fg },
  };
  const sc = statusColors[item.status] ?? statusColors.pending;

  return (
    <View
      style={[
        styles.questionCard,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <View style={styles.qCardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: tints.indigo.bg }]}>
          <ThemedText style={[styles.categoryBadgeText, { color: tints.indigo.fg }]}>
            {item.category}
          </ThemedText>
        </View>
        <View style={styles.qMetaRight}>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <ThemedText style={[styles.statusBadgeText, { color: sc.fg }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" style={styles.qTime}>
            {formatRelative(item.created_at)}
          </ThemedText>
        </View>
      </View>

      <ThemedText themeColor="text" style={styles.qText}>
        {item.question}
      </ThemedText>

      {item.answer && (
        <View style={[styles.answerBox, { backgroundColor: tints.emerald.bg, borderColor: tints.emerald.border }]}>
          <Ionicons name="chatbubble-ellipses" size={14} color={tints.emerald.fg} />
          <ThemedText style={[styles.answerText, { color: colors.text }]}>
            {item.answer}
          </ThemedText>
        </View>
      )}

      {item.status === 'pending' && (
        <ThemedText themeColor="textSecondary" style={styles.pendingNote}>
          Awaiting mentor response · Usually within 48 hours
        </ThemedText>
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
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: FontFamilies.semiBold },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: { fontSize: 13 },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 2,
    borderRadius: 1,
  },
  askContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  promoBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.two,
  },
  promoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  promoTitle: { fontSize: 18, fontFamily: FontFamilies.bold, textAlign: 'center' },
  promoSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  textAreaWrap: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textArea: {
    minHeight: 120,
    padding: 14,
    fontSize: 14,
    fontFamily: FontFamilies.regular,
    lineHeight: 20,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  charHint: { fontSize: 11 },
  charCount: { fontSize: 11, fontFamily: FontFamilies.medium },
  categoryLabel: {
    fontSize: 14,
    fontFamily: FontFamilies.semiBold,
    marginTop: 4,
  },
  categoryPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  categoryPickerText: { fontSize: 14, fontFamily: FontFamilies.regular },
  categoryDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  categoryItemText: { fontSize: 14, fontFamily: FontFamilies.regular },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  myQListContent: { padding: Spacing.three, gap: 12 },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: Spacing.four,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  emptyBtn: { marginTop: 4 },
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
  // Question card
  questionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 10,
  },
  qCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: { fontSize: 11, fontFamily: FontFamilies.medium },
  qMetaRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontFamily: FontFamilies.semiBold },
  qTime: { fontSize: 11 },
  qText: { fontSize: 14, fontFamily: FontFamilies.regular, lineHeight: 21 },
  answerBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  answerText: { flex: 1, fontSize: 13, fontFamily: FontFamilies.regular, lineHeight: 19 },
  pendingNote: { fontSize: 12, fontStyle: 'italic' },
  // Success
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 14,
  },
  successIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: { fontSize: 20, fontFamily: FontFamilies.bold, textAlign: 'center' },
  successSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  successBtn: { width: '100%', marginTop: 8 },
  successBtnOutline: { width: '100%' },
});
