import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { FontFamilies, Spacing } from '@/constants/theme';
import { MentorCard } from '@/features/mentorship/mentor-card';
import { useMentors } from '@/features/mentorship/queries';
import type {
  MentorExperienceFilter,
  MentorFilters,
  MentorModeFilter,
} from '@/features/mentorship/types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';

const PILL_CATEGORIES = [
  { slug: 'all', label: 'All' },
  { slug: 'career', label: 'Career' },
  { slug: 'scholarship', label: 'Scholarship' },
  { slug: 'research', label: 'Research' },
  { slug: 'tuition', label: 'Tuition' },
  { slug: 'partners', label: 'Partners' },
  { slug: 'mess', label: 'Mess & Life' },
  { slug: 'shopping', label: 'Shopping' },
];

/**
 * Screen 3: Mentor Listing (reference `3._mentor_listing`)
 *
 * Full-fidelity recreation of the Stitch reference:
 * - Header with title "Mentors", subtitle, and tune filter button
 * - Live search bar with inline filter adjuster icon
 * - Horizontal Category Filter Pills (All, Career, Scholarship, Research, Tuition...)
 * - Rich vertical Mentor Cards list with avatar, verified badge, skills pills, rating & exp
 * - Heart / favorite interactive bookmarking
 * - Loading, error, and empty states with pull-to-refresh
 */
export default function MentorListingScreen() {
  const colors = useTheme();
  const goBack = useSmartBack('/(tabs)/explore/mentorship');
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    mode?: MentorModeFilter;
    institution?: string;
    experience?: MentorExperienceFilter;
    minRating?: string;
  }>();

  const [searchText, setSearchText] = useState(params.q ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    params.category ?? 'all',
  );

  const debouncedSearch = useDebouncedValue(searchText, 250);

  // Active filters count
  const hasExtraFilters = Boolean(
    (params.mode && params.mode !== 'all') ||
      (params.institution && params.institution !== 'all') ||
      (params.experience && params.experience !== 'all') ||
      params.minRating,
  );

  const filters: MentorFilters = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      mode: params.mode,
      institution: params.institution,
      experience: params.experience,
      minRating: params.minRating ? parseFloat(params.minRating) : undefined,
    }),
    [debouncedSearch, selectedCategory, params.mode, params.institution, params.experience, params.minRating],
  );

  const mentorsQuery = useMentors(filters);
  const mentors = mentorsQuery.data ?? [];

  const handleOpenFilter = () => {
    router.push({
      pathname: '/(tabs)/explore/mentorship/filter' as any,
      params: {
        q: searchText.trim() || undefined,
        category: selectedCategory,
        mode: params.mode,
        institution: params.institution,
        experience: params.experience,
        minRating: params.minRating,
      },
    });
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedCategory('all');
    router.setParams({
      q: undefined,
      category: undefined,
      mode: undefined,
      institution: undefined,
      experience: undefined,
      minRating: undefined,
    });
  };

  const isFiltering =
    searchText.trim().length > 0 ||
    selectedCategory !== 'all' ||
    hasExtraFilters;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => goBack()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View>
              <ThemedText style={styles.title}>Mentors</ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.subtitle}
              >
                Find the right mentor for your goals.
              </ThemedText>
            </View>
          </View>

          {/* Header Filter Icon Button */}
          <Pressable
            onPress={handleOpenFilter}
            accessibilityRole="button"
            accessibilityLabel="Filter mentors"
            style={({ pressed }) => [
              styles.filterIconBtn,
              {
                backgroundColor: hasExtraFilters
                  ? `${colors.primary}1A`
                  : colors.surfaceMuted,
                borderColor: hasExtraFilters ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={hasExtraFilters ? colors.primary : colors.text}
            />
            {hasExtraFilters ? (
              <View
                style={[
                  styles.filterActiveBadge,
                  { backgroundColor: colors.primary },
                ]}
              />
            ) : null}
          </Pressable>
        </View>

        {/* Search Bar with inline filter adjuster */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by name, field, university..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleOpenFilter}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Adjust filters"
            style={styles.inlineFilterBtn}
          >
            <Ionicons
              name="funnel-outline"
              size={15}
              color={hasExtraFilters ? colors.primary : colors.textMuted}
            />
          </Pressable>
        </View>

        {/* Horizontal Category Filter Pills */}
        <View style={styles.pillsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsScroll}
          >
            {PILL_CATEGORIES.map((pill) => {
              const isSelected = selectedCategory === pill.slug;
              return (
                <Pressable
                  key={pill.slug}
                  onPress={() => setSelectedCategory(pill.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${pill.label}`}
                  style={[
                    styles.pill,
                    isSelected
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
                      styles.pillText,
                      isSelected
                        ? { color: '#ffffff' }
                        : { color: colors.bodyStrong },
                    ]}
                  >
                    {pill.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Mentors Scroll Area */}
        <FlatList
          data={mentors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MentorCard mentor={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={mentorsQuery.isRefetching}
              onRefresh={() => mentorsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            mentorsQuery.isLoading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.loaderText}
                >
                  Finding mentors...
                </ThemedText>
              </View>
            ) : (
              <EmptyState
                icon="people-circle-outline"
                title={isFiltering ? 'No mentors match' : 'No mentors yet'}
                message={
                  isFiltering
                    ? 'Try relaxing your search, changing category, or resetting filters.'
                    : 'Mentors are being onboarded. Check back soon!'
                }
                actionLabel={isFiltering ? 'Clear all filters' : undefined}
                onAction={isFiltering ? handleClearFilters : undefined}
              />
            )
          }
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  backBtn: {
    padding: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: FontFamilies.bold,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  filterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterActiveBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FontFamilies.regular,
    padding: 0,
  },
  inlineFilterBtn: {
    padding: 4,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.06)',
    paddingLeft: 8,
  },
  pillsContainer: {
    marginBottom: Spacing.three,
  },
  pillsScroll: {
    gap: Spacing.two,
    paddingVertical: 2,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 11.5,
    fontFamily: FontFamilies.medium,
  },
  listContent: {
    paddingBottom: 40,
    gap: Spacing.three,
  },
  separator: {
    height: Spacing.two,
  },
  loaderWrap: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  loaderText: {
    fontSize: 12,
  },
});
