import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
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
import { useMentors, useMyMentorApplication } from '@/features/mentorship/queries';
import { useMyProfile } from '@/features/profile/queries';
import type { MentorCategory } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { useAuthStore } from '@/store/auth-store';

/**
 * Screen 1: Mentors Home
 *
 * Updated per requirements:
 * - App logo branding in header
 * - User profile picture in top-right (with fallback)
 * - Notification icon removed
 * - Hero banner removed and replaced with a dedicated mentor search bar
 * - Only genuine mentor categories (5 items)
 * - If user is an approved mentor, display Mentor Portal directly on this page
 * - Top mentors and quick actions preserved
 */
export default function MentorsHomeScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore');
  const sessionUser = useAuthStore((s) => s.session?.user);
  const profileQuery = useMyProfile();
  const profile = profileQuery.data;

  const mentorAppQuery = useMyMentorApplication();
  const isApprovedMentor = mentorAppQuery.data?.status === 'approved';

  const [mentorSearch, setMentorSearch] = useState('');

  const mentorsQuery = useMentors();
  const allMentors = mentorsQuery.data ?? [];
  const topMentors = allMentors.slice(0, 3);

  const handleSearchSubmit = () => {
    if (mentorSearch.trim()) {
      router.push({
        pathname: '/(tabs)/explore/mentorship/listing' as any,
        params: { q: mentorSearch.trim() },
      });
    } else {
      router.push('/(tabs)/explore/mentorship/listing' as any);
    }
  };

  const handleCategoryPress = (category: MentorCategory) => {
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

            {/* App Branding with App Logo */}
            <View style={styles.brandTitleWrap}>
              <RNImage
                source={require('@/assets/images/logo-transparent.png')}
                style={styles.appLogo}
                resizeMode="contain"
              />
              <ThemedText style={styles.brandName}>Mentors</ThemedText>
            </View>
          </View>

          {/* Right Header Action: User's Profile Picture (notification icon removed) */}
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel="User profile"
              style={({ pressed }) => [
                styles.avatarCircle,
                { borderColor: colors.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              {profile?.avatar_url ? (
                <ExpoImage
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: tints.indigo.bg }]}>
                  <ThemedText style={[styles.avatarInitial, { color: tints.indigo.fg }]}>
                    {profile?.full_name
                      ? profile.full_name.trim().charAt(0).toUpperCase()
                      : (sessionUser?.email?.[0]?.toUpperCase() ?? 'U')}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          </View>
        </View>
        {/* END: NavigationHeader */}

        {/* BEGIN: Dedicated Mentor Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.mentorSearchBar,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={19} color={colors.primary} style={styles.searchIcon} />
            <TextInput
              value={mentorSearch}
              onChangeText={setMentorSearch}
              onSubmitEditing={handleSearchSubmit}
              placeholder="Search mentors by name, role, skills..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={[styles.mentorSearchInput, { color: colors.text }]}
            />
            {mentorSearch.length > 0 && (
              <Pressable
                onPress={() => setMentorSearch('')}
                hitSlop={8}
                style={styles.searchClearBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </Pressable>
            )}
            <View style={[styles.searchDivider, { backgroundColor: colors.border }]} />
            <Pressable
              onPress={() => router.push('/(tabs)/explore/mentorship/filter')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Mentor filters"
              style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="options-outline" size={19} color={colors.primary} />
            </Pressable>
          </View>
        </View>
        {/* END: Dedicated Mentor Search Bar */}

        {/* BEGIN: Mentor Portal Access Card (Visible when user is an approved mentor) */}
        {isApprovedMentor && (
          <View
            style={[
              styles.mentorPortalCard,
              {
                backgroundColor: colors.background,
                borderColor: tints.emerald.border,
              },
            ]}
          >
            <View style={styles.mentorPortalHeaderRow}>
              <View
                style={[
                  styles.mentorStatusBadge,
                  { backgroundColor: tints.emerald.bg, borderColor: tints.emerald.border },
                ]}
              >
                <Ionicons name="shield-checkmark" size={13} color={tints.emerald.fg} />
                <ThemedText style={[styles.mentorStatusBadgeText, { color: tints.emerald.fg }]}>
                  You are a Verified Mentor
                </ThemedText>
              </View>

              <Pressable
                onPress={() => router.push('/(tabs)/explore/mentorship/edit-profile' as any)}
                style={({ pressed }) => [
                  styles.editProfileBtn,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="create-outline" size={14} color={colors.primary} />
                <ThemedText style={[styles.editProfileBtnText, { color: colors.primary }]}>
                  Edit Profile
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText themeColor="heading" style={styles.mentorPortalCardTitle}>
              Mentor Management Portal
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.mentorPortalCardDesc}>
              Manage student bookings & sessions, update your cover & profile photo, and interact in community discussions.
            </ThemedText>

            <Pressable
              onPress={() => router.push('/(tabs)/explore/mentorship/mentor-portal' as any)}
              style={({ pressed }) => [
                styles.openPortalBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="grid-outline" size={15} color="#ffffff" />
              <ThemedText style={styles.openPortalBtnText}>Open Mentor Portal</ThemedText>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </Pressable>
          </View>
        )}
        {/* END: Mentor Portal Access Card */}

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

        {/* 5 Mentor Categories Grid */}
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

        {/* BEGIN: QuickActionLinks — screens 6-10 */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        </View>
        <View style={styles.quickActionsRow}>
          {[
            ...(isApprovedMentor
              ? [
                  {
                    icon: 'shield-checkmark-outline' as const,
                    label: 'Portal',
                    route: '/(tabs)/explore/mentorship/mentor-portal',
                    tintKey: 'emerald' as const,
                  },
                ]
              : []),
            {
              icon: 'chatbubbles-outline' as const,
              label: 'Messages',
              route: '/(tabs)/explore/mentorship/chat',
              tintKey: 'purple' as const,
            },
            {
              icon: 'calendar-outline' as const,
              label: 'Sessions',
              route: '/(tabs)/explore/mentorship/sessions',
              tintKey: 'indigo' as const,
            },
            {
              icon: 'help-circle-outline' as const,
              label: 'Ask',
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
  mentorPortalCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: 8,
  },
  mentorPortalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mentorStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  mentorStatusBadgeText: {
    fontSize: 11,
    fontFamily: FontFamilies.semiBold,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  editProfileBtnText: {
    fontSize: 11,
    fontFamily: FontFamilies.semiBold,
  },
  mentorPortalCardTitle: {
    fontSize: 15,
    fontFamily: FontFamilies.bold,
  },
  mentorPortalCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  openPortalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  openPortalBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: FontFamilies.bold,
  },
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
  appLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  brandName: {
    fontSize: 18,
    fontFamily: FontFamilies.bold,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontFamily: FontFamilies.bold,
  },
  searchSection: {
    marginVertical: Spacing.two,
  },
  mentorSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    height: 48,
    gap: 10,
  },
  searchIcon: {
    marginLeft: 2,
  },
  mentorSearchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamilies.regular,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },
  filterBtn: {
    padding: 6,
    borderRadius: 8,
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
    marginHorizontal: -2,
    marginBottom: Spacing.three,
  },
  categoryTile: {
    width: '20%',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 6,
    gap: 6,
  },
  categoryTilePressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  categoryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTileLabel: {
    fontSize: 10,
    fontFamily: FontFamilies.medium,
    textAlign: 'center',
    lineHeight: 12,
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
    gap: Spacing.two,
    flex: 1,
  },
  promoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTextWrap: {
    flex: 1,
    gap: 2,
  },
  promoTitle: {
    fontSize: 13,
    fontFamily: FontFamilies.bold,
  },
  promoSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  promoActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderWrap: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  mentorCardsWrap: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  quickActionItem: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: FontFamilies.semiBold,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 32,
  },
});
