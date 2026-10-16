import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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
import { MENTOR_CATEGORIES } from '@/features/mentorship/categories';
import { useMentorInstitutions, useMentors } from '@/features/mentorship/queries';
import type {
  MentorExperienceFilter,
  MentorFilters,
  MentorModeFilter,
} from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';

const EXPERIENCE_OPTIONS: { value: MentorExperienceFilter; label: string }[] = [
  { value: 'all', label: 'Any' },
  { value: '1_2', label: '1–2 years' },
  { value: '3_5', label: '3–5 years' },
  { value: '5_plus', label: '5+ years' },
];

const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Any' },
  { value: 4.0, label: '4.0+ ★' },
  { value: 4.5, label: '4.5+ ★' },
  { value: 4.8, label: '4.8+ ★' },
];

/**
 * Screen 4: Search & Filter (reference `4._search_filter`)
 *
 * Full-fidelity recreation of the Stitch reference:
 * - Search input
 * - Mode selection pills (All, Online, Offline)
 * - Filter cards with icons: Field of Guidance, Institution, Experience Level, Rating
 * - Horizontal Date badges
 * - Sticky bottom bar with live matching mentor count, "Clear All" & "Apply Filters"
 */
export default function SearchFilterScreen() {
  const colors = useTheme();
  const goBack = useSmartBack('/(tabs)/explore/mentorship/listing');
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    mode?: MentorModeFilter;
    institution?: string;
    experience?: MentorExperienceFilter;
    minRating?: string;
    date?: string;
  }>();

  // Filter States
  const [q, setQ] = useState(params.q ?? '');
  const [mode, setMode] = useState<MentorModeFilter>(params.mode ?? 'all');
  const [category, setCategory] = useState(params.category ?? 'all');
  const [institution, setInstitution] = useState(params.institution ?? 'all');
  const [experience, setExperience] = useState<MentorExperienceFilter>(
    params.experience ?? 'all',
  );
  const [minRating, setMinRating] = useState<number>(
    params.minRating ? parseFloat(params.minRating) : 0,
  );
  const [selectedDate, setSelectedDate] = useState(params.date ?? 'today');

  // Expanded card dropdown state
  const [expandedSection, setExpandedSection] = useState<
    'category' | 'institution' | 'experience' | 'rating' | null
  >(null);

  const institutionsQuery = useMentorInstitutions();
  const institutionList = institutionsQuery.data ?? [];

  // Live calculation of matching mentors
  const currentFilters: MentorFilters = useMemo(
    () => ({
      q: q.trim() || undefined,
      category: category !== 'all' ? category : undefined,
      mode: mode !== 'all' ? mode : undefined,
      institution: institution !== 'all' ? institution : undefined,
      experience: experience !== 'all' ? experience : undefined,
      minRating: minRating > 0 ? minRating : undefined,
    }),
    [q, category, mode, institution, experience, minRating],
  );

  const mentorsQuery = useMentors(currentFilters);
  const matchCount = mentorsQuery.data?.length ?? 0;

  // Generate 5 dates for the horizontal date selector
  const dateBadges = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const isToday = i === 0;
      const dayName = isToday
        ? 'Today'
        : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateText = d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
      });
      list.push({ id: isToday ? 'today' : `day-${i}`, dayName, dateText });
    }
    return list;
  }, []);

  const handleClearAll = () => {
    setQ('');
    setMode('all');
    setCategory('all');
    setInstitution('all');
    setExperience('all');
    setMinRating(0);
    setSelectedDate('today');
    setExpandedSection(null);
  };

  const handleApply = () => {
    router.replace({
      pathname: '/(tabs)/explore/mentorship/listing' as any,
      params: {
        q: q.trim() || undefined,
        category: category !== 'all' ? category : undefined,
        mode: mode !== 'all' ? mode : undefined,
        institution: institution !== 'all' ? institution : undefined,
        experience: experience !== 'all' ? experience : undefined,
        minRating: minRating > 0 ? minRating.toString() : undefined,
        date: selectedDate,
      },
    });
  };

  const selectedCategoryObj = MENTOR_CATEGORIES.find((c) => c.slug === category);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Navigation Bar */}
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close filter"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <ThemedText style={styles.navTitle}>Search Mentors</ThemedText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search by name, university, topic..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.text }]}
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Mode Selector Tabs: All, Online, Offline */}
          <View style={styles.modeTabsRow}>
            {(['all', 'remote', 'onsite'] as const).map((m) => {
              const isActive = mode === m;
              const label =
                m === 'all' ? 'All' : m === 'remote' ? 'Online' : 'Offline';
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={[
                    styles.modeTab,
                    isActive
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.modeTabText,
                      isActive
                        ? { color: '#ffffff' }
                        : { color: colors.bodyStrong },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Filter Dropdown Cards Section */}
          <View style={styles.filterCardsSection}>
            {/* 1. Field of Guidance */}
            <Pressable
              onPress={() =>
                setExpandedSection(expandedSection === 'category' ? null : 'category')
              }
              style={[
                styles.filterCard,
                {
                  backgroundColor: colors.background,
                  borderColor:
                    category !== 'all' ? colors.primary : colors.border,
                  boxShadow: `0px 1px 4px ${colors.shadow}`,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.cardIconWrap,
                      { backgroundColor: `${colors.primary}1A` },
                    ]}
                  >
                    <Ionicons name="compass-outline" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <ThemedText style={styles.cardLabel}>Field of Guidance</ThemedText>
                    <ThemedText
                      type="small"
                      style={[
                        styles.cardValue,
                        {
                          color:
                            category !== 'all'
                              ? colors.primary
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {selectedCategoryObj?.name ?? 'Any'}
                    </ThemedText>
                  </View>
                </View>
                <Ionicons
                  name={
                    expandedSection === 'category'
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={16}
                  color={colors.textMuted}
                />
              </View>

              {expandedSection === 'category' ? (
                <View style={styles.optionsWrap}>
                  <Pressable
                    onPress={() => {
                      setCategory('all');
                      setExpandedSection(null);
                    }}
                    style={[
                      styles.optionItem,
                      category === 'all' && {
                        backgroundColor: `${colors.primary}1A`,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.optionText,
                        category === 'all' && {
                          color: colors.primary,
                          fontFamily: FontFamilies.bold,
                        },
                      ]}
                    >
                      Any
                    </ThemedText>
                  </Pressable>
                  {MENTOR_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        setCategory(cat.slug);
                        setExpandedSection(null);
                      }}
                      style={[
                        styles.optionItem,
                        category === cat.slug && {
                          backgroundColor: `${colors.primary}1A`,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.optionText,
                          category === cat.slug && {
                            color: colors.primary,
                            fontFamily: FontFamilies.bold,
                          },
                        ]}
                      >
                        {cat.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Pressable>

            {/* 2. University / Institution */}
            <Pressable
              onPress={() =>
                setExpandedSection(
                  expandedSection === 'institution' ? null : 'institution',
                )
              }
              style={[
                styles.filterCard,
                {
                  backgroundColor: colors.background,
                  borderColor:
                    institution !== 'all' ? colors.primary : colors.border,
                  boxShadow: `0px 1px 4px ${colors.shadow}`,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.cardIconWrap,
                      { backgroundColor: `${colors.primary}1A` },
                    ]}
                  >
                    <Ionicons name="school-outline" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <ThemedText style={styles.cardLabel}>
                      University / Institution
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={[
                        styles.cardValue,
                        {
                          color:
                            institution !== 'all'
                              ? colors.primary
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {institution === 'all' ? 'Any' : institution}
                    </ThemedText>
                  </View>
                </View>
                <Ionicons
                  name={
                    expandedSection === 'institution'
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={16}
                  color={colors.textMuted}
                />
              </View>

              {expandedSection === 'institution' ? (
                <View style={styles.optionsWrap}>
                  <Pressable
                    onPress={() => {
                      setInstitution('all');
                      setExpandedSection(null);
                    }}
                    style={[
                      styles.optionItem,
                      institution === 'all' && {
                        backgroundColor: `${colors.primary}1A`,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.optionText,
                        institution === 'all' && {
                          color: colors.primary,
                          fontFamily: FontFamilies.bold,
                        },
                      ]}
                    >
                      Any
                    </ThemedText>
                  </Pressable>
                  {institutionList.map((inst) => (
                    <Pressable
                      key={inst}
                      onPress={() => {
                        setInstitution(inst);
                        setExpandedSection(null);
                      }}
                      style={[
                        styles.optionItem,
                        institution === inst && {
                          backgroundColor: `${colors.primary}1A`,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.optionText,
                          institution === inst && {
                            color: colors.primary,
                            fontFamily: FontFamilies.bold,
                          },
                        ]}
                      >
                        {inst}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Pressable>

            {/* 3. Experience Level */}
            <Pressable
              onPress={() =>
                setExpandedSection(
                  expandedSection === 'experience' ? null : 'experience',
                )
              }
              style={[
                styles.filterCard,
                {
                  backgroundColor: colors.background,
                  borderColor:
                    experience !== 'all' ? colors.primary : colors.border,
                  boxShadow: `0px 1px 4px ${colors.shadow}`,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.cardIconWrap,
                      { backgroundColor: `${colors.primary}1A` },
                    ]}
                  >
                    <Ionicons name="ribbon-outline" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <ThemedText style={styles.cardLabel}>Experience Level</ThemedText>
                    <ThemedText
                      type="small"
                      style={[
                        styles.cardValue,
                        {
                          color:
                            experience !== 'all'
                              ? colors.primary
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {EXPERIENCE_OPTIONS.find((e) => e.value === experience)
                        ?.label ?? 'Any'}
                    </ThemedText>
                  </View>
                </View>
                <Ionicons
                  name={
                    expandedSection === 'experience'
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={16}
                  color={colors.textMuted}
                />
              </View>

              {expandedSection === 'experience' ? (
                <View style={styles.optionsWrap}>
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setExperience(opt.value);
                        setExpandedSection(null);
                      }}
                      style={[
                        styles.optionItem,
                        experience === opt.value && {
                          backgroundColor: `${colors.primary}1A`,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.optionText,
                          experience === opt.value && {
                            color: colors.primary,
                            fontFamily: FontFamilies.bold,
                          },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Pressable>

            {/* 4. Rating */}
            <Pressable
              onPress={() =>
                setExpandedSection(expandedSection === 'rating' ? null : 'rating')
              }
              style={[
                styles.filterCard,
                {
                  backgroundColor: colors.background,
                  borderColor: minRating > 0 ? colors.primary : colors.border,
                  boxShadow: `0px 1px 4px ${colors.shadow}`,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.cardIconWrap,
                      { backgroundColor: `${colors.primary}1A` },
                    ]}
                  >
                    <Ionicons name="star-outline" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <ThemedText style={styles.cardLabel}>Rating</ThemedText>
                    <ThemedText
                      type="small"
                      style={[
                        styles.cardValue,
                        {
                          color:
                            minRating > 0 ? colors.primary : colors.textMuted,
                        },
                      ]}
                    >
                      {RATING_OPTIONS.find((r) => r.value === minRating)?.label ??
                        'Any'}
                    </ThemedText>
                  </View>
                </View>
                <Ionicons
                  name={
                    expandedSection === 'rating' ? 'chevron-up' : 'chevron-down'
                  }
                  size={16}
                  color={colors.textMuted}
                />
              </View>

              {expandedSection === 'rating' ? (
                <View style={styles.optionsWrap}>
                  {RATING_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setMinRating(opt.value);
                        setExpandedSection(null);
                      }}
                      style={[
                        styles.optionItem,
                        minRating === opt.value && {
                          backgroundColor: `${colors.primary}1A`,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.optionText,
                          minRating === opt.value && {
                            color: colors.primary,
                            fontFamily: FontFamilies.bold,
                          },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Pressable>
          </View>

          {/* Date & Time Selector */}
          <View style={styles.dateSection}>
            <ThemedText style={styles.dateSectionTitle}>Date & Time</ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.dateSectionSub}
            >
              Select availability
            </ThemedText>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateBadgesRow}
            >
              {dateBadges.map((badge) => {
                const isActive = selectedDate === badge.id;
                return (
                  <Pressable
                    key={badge.id}
                    onPress={() => setSelectedDate(badge.id)}
                    style={[
                      styles.dateBadge,
                      isActive
                        ? {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          }
                        : {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                          },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dateBadgeDay,
                        isActive
                          ? { color: 'rgba(255,255,255,0.85)' }
                          : { color: colors.textMuted },
                      ]}
                    >
                      {badge.dayName}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.dateBadgeDate,
                        isActive
                          ? { color: '#ffffff' }
                          : { color: colors.bodyStrong },
                      ]}
                    >
                      {badge.dateText}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Sticky Bottom Action Bar */}
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <PrimaryButton
            label="Apply Filters"
            onPress={handleApply}
            style={styles.applyBtn}
          />
          <View style={styles.footerInfoRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {matchCount} {matchCount === 1 ? 'mentor' : 'mentors'} found
            </ThemedText>
            <Pressable
              onPress={handleClearAll}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <ThemedText style={[styles.clearText, { color: colors.primary }]}>
                Clear All
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 2,
  },
  navTitle: {
    fontSize: 18,
    fontFamily: FontFamilies.bold,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: 110,
    gap: Spacing.three,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamilies.regular,
    padding: 0,
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  modeTabText: {
    fontSize: 12,
    fontFamily: FontFamilies.semiBold,
  },
  filterCardsSection: {
    gap: Spacing.two,
  },
  filterCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: FontFamilies.semiBold,
  },
  cardValue: {
    fontSize: 11,
    marginTop: 1,
  },
  optionsWrap: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: 4,
  },
  optionItem: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 12,
    fontFamily: FontFamilies.regular,
  },
  dateSection: {
    marginTop: Spacing.one,
  },
  dateSectionTitle: {
    fontSize: 13,
    fontFamily: FontFamilies.bold,
  },
  dateSectionSub: {
    fontSize: 11,
    marginBottom: Spacing.two,
  },
  dateBadgesRow: {
    gap: Spacing.two,
    paddingVertical: 2,
  },
  dateBadge: {
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeDay: {
    fontSize: 10,
    fontFamily: FontFamilies.medium,
  },
  dateBadgeDate: {
    fontSize: 12,
    fontFamily: FontFamilies.bold,
    marginTop: 2,
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
    elevation: 8,
  },
  applyBtn: {
    width: '100%',
  },
  footerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  clearText: {
    fontSize: 12,
    fontFamily: FontFamilies.semiBold,
  },
});
