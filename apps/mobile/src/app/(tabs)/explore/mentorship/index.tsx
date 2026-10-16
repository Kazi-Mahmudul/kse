import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { FontFamilies, Spacing } from '@/constants/theme';
import { MENTOR_CATEGORIES } from '@/features/mentorship/categories';
import { MentorCard } from '@/features/mentorship/mentor-card';
import { useMentors } from '@/features/mentorship/queries';
import type { MentorCategory } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { useAuthStore } from '@/store/auth-store';

/**
 * Screen 1: Mentors Home (reference `1._mentors_home`)
 *
 * Full-fidelity recreation of the Stitch reference:
 * - App branding header with notifications bell and profile avatar
 * - Hero banner with gradient, student illustration, and embedded search bar
 * - 8 Mentor Categories (4×2 grid) with "See All" link
 * - Personal Guidance promo card with direct call-to-action
 * - Top Mentors feed preview with live backend data
 */
export default function MentorsHomeScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore');
  const sessionUser = useAuthStore((s) => s.session?.user);
  const [heroSearch, setHeroSearch] = useState('');

  const mentorsQuery = useMentors();
  const allMentors = mentorsQuery.data ?? [];
  const topMentors = allMentors.slice(0, 3);

  const handleSearchSubmit = () => {
    if (heroSearch.trim()) {
      router.push({
        pathname: '/(tabs)/explore/mentorship/listing' as any,
        params: { q: heroSearch.trim() },
      });
    } else {
      router.push('/(tabs)/explore/mentorship/listing' as any);
    }
  };

  const handleCategoryPress = (category: MentorCategory) => {
    if (category.serviceRoute && category.slug === 'more') {
      router.push(category.serviceRoute as any);
      return;
    }
    router.push({
      pathname: '/(tabs)/explore/mentorship/listing' as any,
      params: { category: category.slug },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={true}>
        {/* BEGIN: NavigationHeader */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => goBack()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View style={styles.brandTitleWrap}>
              <View style={[styles.brandBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="people" size={14} color="#ffffff" />
              </View>
              <ThemedText style={styles.brandName}>Sujog Mentors</ThemedText>
            </View>
          </View>

          {/* Right Header Actions: Notification Bell + Avatar */}
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => router.push('/(tabs)/notifications')}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <View style={[styles.notificationDot, { backgroundColor: colors.primary }]} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel="User profile"
              style={({ pressed }) => [
                styles.avatarCircle,
                { borderColor: colors.border, backgroundColor: tints.indigo.bg },
                pressed && { opacity: 0.8 },
              ]}
            >
              <ThemedText style={[styles.avatarInitial, { color: tints.indigo.fg }]}>
                {sessionUser?.email?.[0]?.toUpperCase() ?? 'U'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
        {/* END: NavigationHeader */}

        {/* BEGIN: HeroBannerCard */}
        <LinearGradient
          colors={[colors.bannerFrom, colors.bannerVia, colors.bannerTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Background decorative glow */}
          <View style={styles.heroDecorativeGlow} />

          <View style={styles.heroTopRow}>
            {/* Copy */}
            <View style={styles.heroCopy}>
              <ThemedText style={styles.heroTitle}>
                Find the Right Mentor for Your Future
              </ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                Get expert guidance from experienced professionals and successful students.
              </ThemedText>
            </View>

            {/* Illustration Icon */}
            <View style={styles.heroGraphicWrap}>
              <View style={styles.heroGraphicCircle}>
                <Ionicons name="school" size={42} color="#ffffff" />
              </View>
            </View>
          </View>

          {/* Embedded Search Input */}
          <Pressable
            onPress={handleSearchSubmit}
            style={[styles.heroSearchBar, { backgroundColor: colors.background }]}
          >
            <Ionicons name="search-outline" size={17} color={colors.textMuted} />
            <TextInput
              value={heroSearch}
              onChangeText={setHeroSearch}
              onSubmitEditing={handleSearchSubmit}
              placeholder="Search mentors, topics, or services..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={[styles.heroSearchInput, { color: colors.text }]}
            />
            {heroSearch ? (
              <Pressable
                onPress={() => setHeroSearch('')}
                hitSlop={8}
                style={styles.searchClearBtn}
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </Pressable>
        </LinearGradient>
        {/* END: HeroBannerCard */}

        {/* BEGIN: MentorCategoriesSection */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Mentor Categories</ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/explore/mentorship/categories' as any)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="See all mentor categories"
          >
            <ThemedText style={[styles.seeAllText, { color: colors.primary }]}>
              See All
            </ThemedText>
          </Pressable>
        </View>

        {/* 8 Categories Grid (4 columns x 2 rows) */}
        <View style={styles.categoriesGrid}>
          {MENTOR_CATEGORIES.map((category) => {
            const tint = tints[category.tint] ?? tints.indigo;
            return (
              <Pressable
                key={category.id}
                onPress={() => handleCategoryPress(category)}
                accessibilityRole="button"
                accessibilityLabel={category.name}
                style={({ pressed }) => [
                  styles.categoryTile,
                  pressed && styles.categoryTilePressed,
                ]}
              >
                <View
                  style={[
                    styles.categoryIconWrap,
                    {
                      backgroundColor: tint.bg,
                      borderColor: tint.border,
                    },
                  ]}
                >
                  <Ionicons name={category.icon} size={22} color={tint.fg} />
                </View>
                <ThemedText
                  numberOfLines={2}
                  style={[styles.categoryTileLabel, { color: colors.heading }]}
                >
                  {category.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        {/* END: MentorCategoriesSection */}

        {/* BEGIN: PersonalGuidancePromoCard */}
        <Pressable
          onPress={() => router.push('/(tabs)/explore/mentorship/listing' as any)}
          accessibilityRole="button"
          accessibilityLabel="Need personal guidance? Talk to a mentor."
          style={({ pressed }) => [
            styles.promoBanner,
            {
              backgroundColor: tints.indigo.bg,
              borderColor: tints.indigo.border,
            },
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.promoLeft}>
            <View style={[styles.promoIconCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="compass" size={20} color="#ffffff" />
            </View>
            <View style={styles.promoTextWrap}>
              <ThemedText style={styles.promoTitle}>Need Personal Guidance?</ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.promoSubtitle}
              >
                Talk to a mentor and get the right advice for your journey.
              </ThemedText>
            </View>
          </View>
          <View style={[styles.promoActionBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
          </View>
        </Pressable>
        {/* END: PersonalGuidancePromoCard */}

        {/* BEGIN: TopMentorsFeedPreview */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Top Mentors</ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/explore/mentorship/listing' as any)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View all mentors"
          >
            <ThemedText style={[styles.seeAllText, { color: colors.primary }]}>
              View All ({allMentors.length})
            </ThemedText>
          </Pressable>
        </View>

        {mentorsQuery.isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.mentorCardsWrap}>
            {topMentors.map((mentor) => (
              <MentorCard key={mentor.id} mentor={mentor} />
            ))}
          </View>
        )}
        {/* END: TopMentorsFeedPreview */}

        {/* BEGIN: QuickActionLinks — navigates to new screens 6-10 */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        </View>
        <View style={styles.quickActionsRow}>
          {[
            {
              icon: 'calendar-outline' as const,
              label: 'My Sessions',
              route: '/(tabs)/explore/mentorship/sessions',
              tintKey: 'indigo' as const,
            },
            {
              icon: 'help-circle-outline' as const,
              label: 'Ask a Question',
              route: '/(tabs)/explore/mentorship/ask',
              tintKey: 'amber' as const,
            },
            {
              icon: 'people-outline' as const,
              label: 'Community',
              route: '/(tabs)/explore/mentorship/community',
              tintKey: 'emerald' as const,
            },
          ].map((item) => {
            const tint = tints[item.tintKey];
            return (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => [
                  styles.quickActionItem,
                  {
                    backgroundColor: tint.bg,
                    borderColor: tint.border,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Ionicons name={item.icon} size={22} color={tint.fg} />
                <ThemedText style={[styles.quickActionLabel, { color: tint.fg }]}>
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        {/* END: QuickActionLinks */}

        <View style={styles.bottomSpacer} />
      </Screen>
    </>
  );
}


const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    marginBottom: Spacing.one,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 18,
    fontFamily: FontFamilies.bold,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconBtn: {
    position: 'relative',
    padding: 6,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 13,
    fontFamily: FontFamilies.semiBold,
  },
  heroCard: {
    borderRadius: 20,
    padding: Spacing.four,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: Spacing.four,
    elevation: 3,
  },
  heroDecorativeGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    paddingRight: Spacing.two,
    gap: 4,
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: FontFamilies.bold,
    color: '#ffffff',
    lineHeight: 22,
  },
  heroSubtitle: {
    fontSize: 11,
    fontFamily: FontFamilies.regular,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
  heroGraphicWrap: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGraphicCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 9,
    marginTop: Spacing.three,
    gap: 8,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamilies.regular,
    padding: 0,
  },
  searchClearBtn: {
    padding: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FontFamilies.bold,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: FontFamilies.semiBold,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: Spacing.three,
  },
  categoryTile: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 6,
  },
  categoryTilePressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTileLabel: {
    fontSize: 10.5,
    fontFamily: FontFamilies.medium,
    textAlign: 'center',
    lineHeight: 13,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  promoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
    paddingRight: Spacing.two,
  },
  promoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTextWrap: {
    flex: 1,
    gap: 2,
  },
  promoTitle: {
    fontSize: 12,
    fontFamily: FontFamilies.bold,
  },
  promoSubtitle: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  promoActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentorCardsWrap: {
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  loaderWrap: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.one,
  },
  quickActionItem: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: FontFamilies.semiBold,
    textAlign: 'center',
  },
});

