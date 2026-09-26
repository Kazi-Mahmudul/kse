import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { MyListingRow } from '@/features/tolet/components/my-listing-row';
import { useMyToletListings, useWithdrawToletListing } from '@/features/tolet/queries';
import { useTheme } from '@/hooks/use-theme';
import { analytics } from '@/lib/analytics';
import { alertDialog, confirmDialog } from '@/lib/confirm';
import type { ToletListingSummary } from '@kse/types';

/**
 * Owner-facing "My To-Let listings" (spec bachelor-to-let §Owner).
 *
 * Lists every listing the signed-in student owns, including non-published
 * rows (Pending review, Rejected, Archived). Each row exposes:
 *   - status chip (workflow state)
 *   - listing-status chip (Available / Almost Full / Full / Unavailable)
 *   - withdraw action (sets status='archived' for unpublished rows)
 *   - open detail / edit (placeholder — edit route deferred)
 *
 * Reads come through `tolet-actions` Edge Function (service-role + ownership
 * filter), so RLS does not need a new policy to expose owner rows.
 */
export default function MyToletListingsScreen() {
  const colors = useTheme();
  const query = useMyToletListings();
  const withdraw = useWithdrawToletListing();

  const items = query.data ?? [];

  const handleWithdraw = useCallback(
    async (listing: ToletListingSummary) => {
      const ok = await confirmDialog({
        title: 'Withdraw this listing?',
        message: `"${listing.title}" will be removed from public view. You can repost later from the form.`,
        confirmLabel: 'Withdraw',
        cancelLabel: 'Keep',
      });
      if (!ok) return;
      try {
        await withdraw.mutateAsync(listing.id);
        analytics.toletListingWithdrawn(listing.id);
        alertDialog({ title: 'Withdrawn', message: 'Your listing is no longer visible.' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not withdraw';
        alertDialog({ title: 'Withdraw failed', message });
      }
    },
    [withdraw],
  );

  const handleOpen = useCallback((listing: ToletListingSummary) => {
    router.push(`/(tabs)/explore/tolet/${listing.id}`);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <ThemedText type="title">My To-Let listings</ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/explore/tolet/post')}
            accessibilityRole="button"
            accessibilityLabel="Post a new listing"
            hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </Pressable>
        </View>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading your listings…
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MyListingRow
                listing={item}
                onOpen={() => handleOpen(item)}
                onWithdraw={() => handleWithdraw(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="home-outline"
                title="You haven't posted a listing yet"
                message="Post your first Bachelor To-Let listing to help other students find a room near campus."
                actionLabel="Post a listing"
                onAction={() => router.push('/(tabs)/explore/tolet/post')}
              />
            }
            ListFooterComponent={
              items.length > 0 ? (
                <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    Showing {items.length} listing{items.length === 1 ? '' : 's'}.
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {items.length > 0 ? (
          <View style={styles.fabWrap} pointerEvents="box-none">
            <PrimaryButton
              label="Post a new listing"
              onPress={() => router.push('/(tabs)/explore/tolet/post')}
            />
          </View>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 120,
    gap: Spacing.three,
  },
  separator: {
    height: Spacing.three,
  },
  footer: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  fabWrap: {
    position: 'absolute',
    bottom: Spacing.four,
    left: Spacing.three,
    right: Spacing.three,
  },
});
