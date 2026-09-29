import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useMemo, useState } from 'react';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { ListingCard } from '@/features/hub/components/listing-card';
import {
  useHubCategories,
  useHubFacets,
  useHubFeed,
} from '@/features/hub/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { blurActiveElement } from '@/lib/focus';
import { HUB_SERVICE_TYPE_LABELS } from '@kse/shared';
import type { HubServiceType } from '@kse/types';

/**
 * Category screen (spec student-hub §5/§9): search + dynamic filters
 * (service types found in this category, verified, discount, open now,
 * area facets) over server-side paginated listings.
 */
export default function HubCategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useTheme();
  const [rawQuery, setRawQuery] = useState('');
  const q = useDebouncedValue(rawQuery, 300);
  const [serviceType, setServiceType] = useState<HubServiceType | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [openNow, setOpenNow] = useState(false);

  const { data: categories } = useHubCategories();
  const category = useMemo(
    () => (categories ?? []).find((c) => c.slug === slug) ?? null,
    [categories, slug],
  );

  const filters = useMemo(
    () => ({
      q: q || undefined,
      categorySlug: slug,
      serviceType: serviceType ?? undefined,
      area: area ?? undefined,
      verified: verifiedOnly || undefined,
      discount: discountOnly || undefined,
      openNow: openNow || undefined,
    }),
    [q, slug, serviceType, area, verifiedOnly, discountOnly, openNow],
  );

  const feed = useHubFeed(filters);
  const facets = useHubFacets(slug);

  const rows = useMemo(
    () => feed.data?.pages.flatMap((page) => page.rows) ?? [],
    [feed.data],
  );

  const serviceOptions = useMemo(() => {
    // Service types relevant to this category's listings (dynamic, §9).
    const present = new Set<HubServiceType>();
    for (const page of feed.data?.pages ?? []) {
      for (const row of page.rows) present.add(row.service_type);
    }
    return Array.from(present);
  }, [feed.data]);

  const title = category?.name ?? 'Student Hub';
  const hasAnyFilter = Boolean(serviceType || area || verifiedOnly || discountOnly || openNow || q);

  const anyPending = feed.isPending;
  const showEmpty = feed.isSuccess && rows.length === 0;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title={title} />
      {category?.description ? (
        <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.two }}>
          {category.description}
        </ThemedText>
      ) : null}

      <SearchBar
        value={rawQuery}
        onChangeText={setRawQuery}
        placeholder="Search shops…"
        variant="card"
        onSubmitEditing={blurActiveElement}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {serviceOptions.map((type) => (
          <Chip
            key={type}
            label={HUB_SERVICE_TYPE_LABELS[type]}
            selected={serviceType === type}
            onPress={() => setServiceType(serviceType === type ? null : type)}
          />
        ))}
        <Chip
          label="Verified"
          selected={verifiedOnly}
          onPress={() => setVerifiedOnly(!verifiedOnly)}
        />
        <Chip
          label="Student discount"
          selected={discountOnly}
          onPress={() => setDiscountOnly(!discountOnly)}
        />
        <Chip
          label="Open now"
          selected={openNow}
          onPress={() => setOpenNow(!openNow)}
        />
        {facets.data?.areas.map((a) => (
          <Chip
            key={a.value}
            label={a.value}
            selected={area === a.value}
            onPress={() => setArea(area === a.value ? null : a.value)}
          />
        ))}
      </ScrollView>

      {/* Feature entry points declared by the category (Study & Research) */}
      {category?.features?.includes('book_exchange') || category?.features?.includes('research_partners') ? (
        <View style={styles.featureRow}>
          {category.features.includes('book_exchange') ? (
            <FeaturePill
              icon="swap-horizontal-outline"
              label="Book Exchange"
              onPress={() => router.push('/hub/book-exchange')}
            />
          ) : null}
          {category.features.includes('research_partners') ? (
            <FeaturePill
              icon="flask-outline"
              label="Research Partners"
              onPress={() => router.push('/hub/research')}
            />
          ) : null}
        </View>
      ) : null}

      {anyPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : feed.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load listings"
          message={(feed.error as Error).message}
          actionLabel="Try again"
          onAction={() => feed.refetch()}
        />
      ) : showEmpty ? (
        <EmptyState
          icon="search-outline"
          title="Nothing found"
          message={
            hasAnyFilter
              ? 'Try another area or remove some filters.'
              : 'No listings in this category yet — check back soon.'
          }
          {...(hasAnyFilter
            ? {
                actionLabel: 'Clear filters',
                onAction: () => {
                  setServiceType(null);
                  setArea(null);
                  setVerifiedOnly(false);
                  setDiscountOnly(false);
                  setOpenNow(false);
                  setRawQuery('');
                },
              }
            : {})}
        />
      ) : (
        <View style={styles.list}>
          {rows.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
          {feed.hasNextPage ? (
            <PrimaryButton
              label="Load more"
              variant="outline"
              onPress={() => feed.fetchNextPage()}
              loading={feed.isFetchingNextPage}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function FeaturePill({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.featurePill,
        { backgroundColor: colors.backgroundElement, borderColor: colors.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Ionicons name={icon} size={15} color={colors.primary} />
      <ThemedText type="small" style={{ color: colors.primary, fontWeight: '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    gap: Spacing.one + 2,
    paddingVertical: Spacing.two,
  },
  featureRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
  },
  list: {
    gap: Spacing.two + 2,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
});
