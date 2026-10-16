import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useMentor } from '@/features/mentorship/queries';
import { useSavedOpportunityIds, useToggleSavedOpportunity } from '@/features/saved/queries';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { analytics } from '@/lib/analytics';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * Screen 5: Mentor Profile (reference `5._mentor_profile`)
 *
 * Full-fidelity recreation of the Stitch reference:
 * - Architectural lineart / theme-tailored hero header with verified badge
 * - Top back button and bookmark toggle
 * - Large centered avatar with border and ring
 * - Name, verified icon, role/institution, rating + reviews, and experience
 * - Expertise pills
 * - "About" section with bio & guidance focus areas
 * - Mentor Credentials cards: Education, Experience, Session Format
 * - Sticky Bottom Action Buttons: "Message" and "Book a Session"
 */
export default function MentorProfileScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship');
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useMentor(id);
  const mentor = query.data;

  const savedIdsQuery = useSavedOpportunityIds();
  const toggleSaved = useToggleSavedOpportunity();
  const isSaved = id ? savedIdsQuery.data?.has(id) ?? false : false;

  useEffect(() => {
    if (mentor?.id) {
      analytics.opportunityViewed(mentor.id, 'mentorship');
    }
  }, [mentor?.id]);

  const handleToggleFavorite = () => {
    if (!id) return;
    const nextSaved = !isSaved;
    toggleSaved.mutate({ opportunityId: id, saved: nextSaved });
    analytics.opportunitySaved(id, nextSaved);
  };

  const handleOpenChat = () => {
    if (id) router.push(`/(tabs)/explore/mentorship/chat/${id}` as any);
  };

  const handleOpenBookSession = () => {
    if (id) router.push({ pathname: '/(tabs)/explore/mentorship/book-session' as any, params: { id } });
  };

  if (query.isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.loadingText}>
            Loading mentor profile...
          </ThemedText>
        </View>
      </>
    );
  }

  if (query.isError || !mentor) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <EmptyState
            icon="alert-circle-outline"
            title="Mentor Not Found"
            message={
              query.error?.message ||
              'The mentor profile you are looking for does not exist or has been removed.'
            }
            actionLabel="Return to Mentors"
            onAction={() => goBack()}
          />
        </View>
      </>
    );
  }

  const rating = Number(mentor.rating_avg) || 4.8;
  const ratingCount = Number(mentor.rating_count) || 1;
  const experienceYears = Number(mentor.experience_years) || 3;
  const tags = mentor.tags.length > 0 ? mentor.tags : ['Career', 'Guidance', 'Mentoring'];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* BEGIN: HeroHeader with Cover Photo */}
          <View style={styles.heroCover}>
            {mentor.cover_image_url ? (
              <Image
                source={{ uri: mentor.cover_image_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={[colors.bannerFrom, colors.bannerVia, colors.bannerTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              >
                {/* Background Decorative Circles */}
                <View style={styles.heroGlowCircle} />
                <View style={styles.heroGlowCircleSmall} />
              </LinearGradient>
            )}

            {/* Gradient shadow overlay for crystal-clear readability of buttons and contrast */}
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']}
              style={StyleSheet.absoluteFill}
            />

            {/* Top Navigation Controls */}
            <View style={styles.topNavControls}>
              <Pressable
                onPress={() => goBack()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={[styles.navCircleBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
              >
                <Ionicons name="chevron-back" size={20} color="#ffffff" />
              </Pressable>

              <Pressable
                onPress={handleToggleFavorite}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={isSaved ? 'Remove from saved' : 'Save mentor'}
                style={[styles.navCircleBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
              >
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isSaved ? '#EF4444' : '#ffffff'}
                />
              </Pressable>
            </View>

            {/* Verified Badge Pill (bottom right) */}
            {mentor.verified ? (
              <View style={[styles.verifiedPill, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                <ThemedText style={styles.verifiedText}>Verified</ThemedText>
              </View>
            ) : null}
          </View>
          {/* END: HeroHeader */}

          {/* BEGIN: AvatarSection */}
          <View style={styles.avatarSection}>
            <View
              style={[
                styles.avatarWrapper,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.background,
                  boxShadow: `0px 4px 14px ${colors.shadow}`,
                },
              ]}
            >
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: tints.indigo.bg },
                ]}
              >
                <ThemedText
                  style={[styles.avatarInitials, { color: tints.indigo.fg }]}
                >
                  {initials(mentor.title)}
                </ThemedText>
              </View>
              {mentor.image_url ? (
                <Image
                  source={{ uri: mentor.image_url }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : null}
            </View>
          </View>
          {/* END: AvatarSection */}

          {/* BEGIN: MentorSummary */}
          <View style={styles.mentorIdentitySection}>
            {/* Mentor Name with Verified Badge */}
            <View style={styles.nameRow}>
              <ThemedText style={styles.mentorName}>{mentor.title}</ThemedText>
              {mentor.verified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={colors.primary}
                />
              ) : null}
            </View>

            {/* Academic Institution or Role */}
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.roleText}
            >
              {mentor.education ?? mentor.organization_name}
            </ThemedText>

            {/* Rating & Experience Meta */}
            <View style={styles.ratingExpRow}>
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <ThemedText style={styles.ratingValue}>
                  {rating.toFixed(1)}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.reviewsCount}
                >
                  ({ratingCount} reviews)
                </ThemedText>
              </View>

              <ThemedText style={[styles.metaDot, { color: colors.border }]}>•</ThemedText>

              <View style={styles.experienceBox}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.experienceLabel}
                >
                  {experienceYears}+ years experience
                </ThemedText>
              </View>
            </View>

            {/* Specialty Tags / Pills */}
            <View style={styles.pillsRow}>
              {tags.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: tints.indigo.bg,
                      borderColor: tints.indigo.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.tagPillText, { color: tints.indigo.fg }]}
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ')}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
          {/* END: MentorSummary */}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* BEGIN: AboutSection */}
          <View style={styles.aboutSection}>
            <ThemedText style={styles.sectionHeading}>About</ThemedText>
            <ThemedText
              type="small"
              themeColor="bodyStrong"
              style={styles.aboutBody}
            >
              {mentor.description ?? mentor.summary ?? 'Experienced mentor dedicated to guiding students through career, higher studies, and skill mastery.'}
            </ThemedText>
          </View>
          {/* END: AboutSection */}

          {/* BEGIN: MentorDetailsList (Credentials) */}
          <View style={styles.credentialsList}>
            {/* 1. Education Card */}
            <View
              style={[
                styles.credentialCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.credentialIconCircle,
                  { backgroundColor: tints.indigo.bg, borderColor: tints.indigo.border },
                ]}
              >
                <Ionicons name="school-outline" size={18} color={tints.indigo.fg} />
              </View>
              <View style={styles.credentialTextWrap}>
                <ThemedText style={styles.credentialTitle}>Education</ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.credentialSubtitle}
                >
                  {mentor.education ?? 'Higher Education Graduate'}
                </ThemedText>
              </View>
            </View>

            {/* 2. Experience Card */}
            <View
              style={[
                styles.credentialCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.credentialIconCircle,
                  { backgroundColor: tints.indigo.bg, borderColor: tints.indigo.border },
                ]}
              >
                <Ionicons name="briefcase-outline" size={18} color={tints.indigo.fg} />
              </View>
              <View style={styles.credentialTextWrap}>
                <ThemedText style={styles.credentialTitle}>Experience</ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.credentialSubtitle}
                >
                  {experienceYears}+ years in professional & academic guidance
                </ThemedText>
              </View>
            </View>

            {/* 3. Session Format Card */}
            <View
              style={[
                styles.credentialCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.credentialIconCircle,
                  { backgroundColor: tints.indigo.bg, borderColor: tints.indigo.border },
                ]}
              >
                <Ionicons name="ribbon-outline" size={18} color={tints.indigo.fg} />
              </View>
              <View style={styles.credentialTextWrap}>
                <ThemedText style={styles.credentialTitle}>
                  Session Format & Availability
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.credentialSubtitle}
                >
                  {mentor.opportunity_mode === 'remote'
                    ? 'Remote (Online 1:1 sessions)'
                    : mentor.opportunity_mode === 'hybrid'
                      ? `Hybrid (${mentor.location ?? 'Khulna'} & Remote)`
                      : `In-person (${mentor.location ?? 'Khulna'})`}
                  {mentor.deadline_note ? ` · ${mentor.deadline_note}` : ''}
                </ThemedText>
              </View>
            </View>
          </View>
          {/* END: MentorDetailsList */}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* BEGIN: StickyBottomActionButtons */}
        <View
          style={[
            styles.bottomActionBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          {/* Outlined Message Button — navigates to chat screen */}
          <Pressable
            onPress={handleOpenChat}
            accessibilityRole="button"
            accessibilityLabel="Message mentor"
            style={({ pressed }) => [
              styles.actionBtnOutlined,
              { borderColor: colors.primary },
              pressed && { backgroundColor: `${colors.primary}12` },
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={16}
              color={colors.primary}
            />
            <ThemedText style={[styles.actionBtnOutlinedText, { color: colors.primary }]}>
              Message
            </ThemedText>
          </Pressable>

          {/* Primary Solid Book a Session — navigates to dedicated booking screen */}
          <Pressable
            onPress={handleOpenBookSession}
            accessibilityRole="button"
            accessibilityLabel="Book a session with mentor"
            style={({ pressed }) => [
              styles.actionBtnSolid,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
          >
            <Ionicons name="calendar-outline" size={16} color="#ffffff" />
            <ThemedText style={styles.actionBtnSolidText}>
              Book a Session
            </ThemedText>
          </Pressable>
        </View>
        {/* END: StickyBottomActionButtons */}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  loadingText: {
    marginTop: Spacing.two,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroCover: {
    height: 165,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlowCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroGlowCircleSmall: {
    position: 'absolute',
    bottom: -20,
    left: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  topNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'ios' ? 44 : Spacing.four,
  },
  navCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedPill: {
    position: 'absolute',
    bottom: Spacing.two,
    right: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 10.5,
    fontFamily: FontFamilies.medium,
    color: '#059669',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: -48,
    zIndex: 10,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3.5,
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
  },
  avatarFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: FontFamilies.bold,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  mentorIdentitySection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mentorName: {
    fontSize: 19,
    fontFamily: FontFamilies.bold,
    letterSpacing: -0.3,
  },
  roleText: {
    fontSize: 12,
    textAlign: 'center',
  },
  ratingExpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontSize: 12,
    fontFamily: FontFamilies.bold,
  },
  reviewsCount: {
    fontSize: 11,
  },
  metaDot: {
    fontSize: 11,
  },
  experienceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  experienceLabel: {
    fontSize: 11,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.two,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  tagPillText: {
    fontSize: 11,
    fontFamily: FontFamilies.medium,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.four,
  },
  aboutSection: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: FontFamilies.bold,
  },
  aboutBody: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  credentialsList: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  credentialCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
  },
  credentialIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  credentialTextWrap: {
    flex: 1,
    gap: 2,
  },
  credentialTitle: {
    fontSize: 12.5,
    fontFamily: FontFamilies.semiBold,
  },
  credentialSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 20,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.three,
    borderTopWidth: 1,
    elevation: 8,
  },
  actionBtnOutlined: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  actionBtnOutlinedText: {
    fontSize: 13,
    fontFamily: FontFamilies.semiBold,
  },
  actionBtnSolid: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  actionBtnSolidText: {
    fontSize: 13,
    fontFamily: FontFamilies.semiBold,
    color: '#ffffff',
  },
});
