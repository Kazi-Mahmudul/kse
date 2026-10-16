import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { FontFamilies, Spacing } from '@/constants/theme';
import { MENTOR_CATEGORIES } from '@/features/mentorship/categories';
import type { MentorCategory } from '@/features/mentorship/types';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

/**
 * Screen 2: Mentor Categories (reference `2._mentor_categories`)
 *
 * Full-fidelity recreation of the Stitch reference:
 * - Header with smart back navigation and "Mentor Categories" title
 * - Informative subtitle
 * - Full list of category cards with custom tints, icons, and descriptions
 * - Interactive navigation to filtered Mentor Listing
 */
export default function MentorCategoriesScreen() {
  const colors = useTheme();
  const tints = useTints();
  const goBack = useSmartBack('/(tabs)/explore/mentorship');

  const handleSelectCategory = (category: MentorCategory) => {
    router.push({
      pathname: '/(tabs)/explore/mentorship/listing' as any,
      params: { category: category.slug },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={true}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <Pressable
            onPress={() => goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <ThemedText style={styles.pageTitle}>Mentor Categories</ThemedText>
        </View>

        {/* Subheading description */}
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.subheading}
        >
          Choose a category to find the right mentor for your needs.
        </ThemedText>

        {/* Vertical List of Category Cards */}
        <View style={styles.cardList}>
          {MENTOR_CATEGORIES.map((category) => {
            const tint = tints[category.tint] ?? tints.indigo;

            return (
              <Pressable
                key={category.id}
                onPress={() => handleSelectCategory(category)}
                accessibilityRole="button"
                accessibilityLabel={`${category.name}: ${category.description}`}
                style={({ pressed }) => [
                  styles.categoryCard,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    boxShadow: `0px 1px 6px ${colors.shadow}`,
                  },
                  pressed && styles.categoryCardPressed,
                ]}
              >
                <View style={styles.cardLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: tint.bg,
                        borderColor: tint.border,
                      },
                    ]}
                  >
                    <Ionicons name={category.icon} size={22} color={tint.fg} />
                  </View>

                  <View style={styles.textWrap}>
                    <ThemedText style={styles.cardTitle}>{category.name}</ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.cardDesc}
                      numberOfLines={1}
                    >
                      {category.description}
                    </ThemedText>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.one,
  },
  backBtn: {
    padding: 2,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: FontFamilies.bold,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 13,
    marginBottom: Spacing.four,
  },
  cardList: {
    gap: Spacing.two,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
  },
  categoryCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
    paddingRight: Spacing.two,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: FontFamilies.semiBold,
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  bottomSpacer: {
    height: 40,
  },
});
