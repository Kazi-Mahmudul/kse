import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { PostToletForm } from '@/features/tolet/components/post-tolet-form';
import { useTheme } from '@/hooks/use-theme';

/**
 * Post-a-To-Let modal (spec bachelor-to-let §Post).
 *
 * Presented as a stack modal so it slides up over the hub. The form is
 * self-contained — it owns its own submit logic via `useSubmitListing` /
 * `useUpdateOwnListing` and writes through the `tolet-actions` Edge Function.
 * On success we close the modal and return to the hub, which invalidates the
 * relevant query keys so the new listing appears immediately under "My listings"
 * (pending) and the count badge refreshes.
 */
export default function PostToletScreen() {
  const colors = useTheme();

  const handleSubmitted = useCallback((listingId: string) => {
    void listingId;
    router.back();
  }, []);

  const handleCancel = useCallback(() => {
    router.back();
  }, []);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <View style={styles.header}>
        <Pressable
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <ThemedText type="title">Post a To-Let</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PostToletForm onSubmitted={handleSubmitted} />
      </ScrollView>
    </Screen>
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
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
});
