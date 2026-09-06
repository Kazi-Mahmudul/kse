import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { findCategory } from '@/features/explore/categories';

/**
 * Per-category placeholder — real listings (Supabase + TanStack Query,
 * pagination, filters) arrive with step 8 "Mobile opportunity list".
 */
export default function ExploreTypeScreen() {
  const colors = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const category = type ? findCategory(type) : undefined;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText type="subtitle">{category?.label ?? 'Explore'}</ThemedText>
      </View>

      {category ? (
        <EmptyState
          icon={category.icon}
          title={`${category.label} listings are coming`}
          message="Verified, hand-managed listings appear here once the opportunities module ships."
          actionLabel="Back to categories"
          onAction={() => router.back()}
        />
      ) : (
        <EmptyState
          icon="alert-circle-outline"
          title="Unknown section"
          message="This explore section does not exist yet."
          actionLabel="Back to categories"
          onAction={() => router.back()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  back: {
    padding: Spacing.one,
    marginLeft: -Spacing.one + 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
