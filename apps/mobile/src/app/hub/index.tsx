import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing, type TintKey } from '@/constants/theme';
import { useHubCategories } from '@/features/hub/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { ComponentProps } from 'react';
import type { HubCategory } from '@kse/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Fallback glyphs when a category carries an unknown icon name. */
const CATEGORY_FALLBACK_ICON: Record<string, IoniconName> = {
  'study-research': 'book-outline',
  'daily-life': 'construct-outline',
  mobility: 'bicycle-outline',
  'student-deals': 'pricetag-outline',
};

function categoryIcon(category: HubCategory): IoniconName {
  const name = category.icon as IoniconName;
  return name ?? CATEGORY_FALLBACK_ICON[category.slug] ?? 'grid-outline';
}

/**
 * Student Hub home (spec student-hub §4): header, dynamic category cards
 * from `student_hub_categories`, plus the two people-powered features
 * (Book Exchange, Research Partners).
 */
export default function StudentHubScreen() {
  const colors = useTheme();
  const tints = useTints();
  const { data: categories, isPending, isError, error, refetch } = useHubCategories();

  const tintKeys = Object.keys(tints) as TintKey[];

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="Student Hub" />
      <View style={styles.intro}>
        <ThemedText type="default">
          Useful places, services and opportunities for students in Khulna.
        </ThemedText>
      </View>

      <Pressable
        onPress={() => router.push('/hub/search')}
        accessibilityRole="button"
        accessibilityLabel="Search Student Hub"
        style={({ pressed }) => [
          styles.searchTile,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.border,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <ThemedText type="small" style={{ color: colors.textSecondary, flex: 1 }}>
          Search places, services, shops…
        </ThemedText>
      </Pressable>

      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load Student Hub"
          message={(error as Error).message}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : (
        <View style={styles.grid}>
          {(categories ?? []).map((category, index) => {
            const tint = tints[tintKeys[index % tintKeys.length]] ?? tints.indigo;
            return (
              <Pressable
                key={category.id}
                onPress={() =>
                  router.push({ pathname: '/hub/category/[slug]', params: { slug: category.slug } })
                }
                accessibilityRole="button"
                accessibilityLabel={category.name}
                style={({ pressed }) => [
                  styles.categoryCard,
                  {
                    backgroundColor: colors.background,
                    borderColor: tint.border,
                    boxShadow: `0px 1px 6px ${colors.shadow}`,
                  },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: tint.bg }]}>
                  <Ionicons name={categoryIcon(category)} size={26} color={tint.fg} />
                </View>
                <View style={styles.categoryBody}>
                  <ThemedText type="default" style={{ fontWeight: '700' }}>
                    {category.name}
                  </ThemedText>
                  {category.description ? (
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {category.description}
                    </ThemedText>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* People-powered features — always available regardless of categories */}
      <View style={styles.grid}>
        <FeatureTile
          icon="swap-horizontal-outline"
          tintKey="emerald"
          title="Book Exchange Corner"
          subtitle="Exchange, sell or give away used books"
          onPress={() => router.push('/hub/book-exchange')}
        />
        <FeatureTile
          icon="flask-outline"
          tintKey="purple"
          title="Research Partners"
          subtitle="Find collaborators across Khulna Division"
          onPress={() => router.push('/hub/research')}
        />
      </View>
    </Screen>
  );
}

function FeatureTile({
  icon,
  tintKey,
  title,
  subtitle,
  onPress,
}: {
  icon: IoniconName;
  tintKey: TintKey;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  const tints = useTints();
  const tint = tints[tintKey];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.categoryCard,
        {
          backgroundColor: colors.background,
          borderColor: tint.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.categoryIcon, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={26} color={tint.fg} />
      </View>
      <View style={styles.categoryBody}>
        <ThemedText type="default" style={{ fontWeight: '700' }}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {subtitle}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: Spacing.two,
    marginBottom: Spacing.two + 2,
  },
  searchTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    height: 46,
    marginBottom: Spacing.three,
  },
  grid: {
    gap: Spacing.two + 2,
    marginBottom: Spacing.three,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBody: {
    flex: 1,
    gap: 2,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
});
