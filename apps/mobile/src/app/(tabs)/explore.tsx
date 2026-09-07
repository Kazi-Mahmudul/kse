import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing, ThemeColor } from '@/constants/theme';
import { EXPLORE_CATEGORIES } from '@/features/explore/categories';
import { useTheme } from '@/hooks/use-theme';

/** Explore hub (spec §32): every discovery section in one grid. */
export default function ExploreScreen() {
  const [query, setQuery] = useState('');

  return (
    <Screen>
      <ThemedText type="subtitle">Explore</ThemedText>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() =>
          router.push({
            pathname: '/(tabs)/search',
            params: query.trim() ? { q: query.trim() } : {},
          })
        }
      />

      <SectionHeader title="Categories" />
      <View style={styles.grid}>
        {EXPLORE_CATEGORIES.map((category) => (
          <CategoryTile key={category.slug} category={category} />
        ))}
      </View>
    </Screen>
  );
}

function CategoryTile({
  category,
}: {
  category: (typeof EXPLORE_CATEGORIES)[number];
}) {
  const colors = useTheme();
  const tint = colors[category.tint as ThemeColor];

  return (
    <Card
      onPress={() =>
        router.push({ pathname: '/(tabs)/explore/[type]', params: { type: category.slug } })
      }
      style={styles.tile}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={category.icon} size={24} color={tint} />
      </View>
      <ThemedText type="smallBold">{category.label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {category.description}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    gap: Spacing.one + 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
});
