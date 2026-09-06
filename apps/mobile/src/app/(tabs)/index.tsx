import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

/**
 * Home shell — greeting, search, promo banner, recommendations slot.
 * Live opportunity data lands in step 8 (opportunity list).
 */
export default function HomeScreen() {
  const colors = useTheme();
  const session = useAuthStore((s) => s.session);
  const [query, setQuery] = useState('');

  const fullName = (session?.user.user_metadata?.full_name as string | undefined) ?? '';
  const firstName = fullName.trim().split(/\s+/)[0] || session?.user.email?.split('@')[0] || 'there';

  return (
    <Screen>
      <View style={styles.greeting}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            Welcome back
          </ThemedText>
          <ThemedText type="subtitle">Hi {firstName} 👋</ThemedText>
        </View>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}1A` }]}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => router.push('/(tabs)/explore')}
      />

      <Card tint="primary">
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <ThemedText type="subtitle" themeColor="onPrimary">
              Internship Opportunities
            </ThemedText>
            <ThemedText type="small" themeColor="onPrimary">
              Handpicked internships from verified organizations — find one that fits you.
            </ThemedText>
          </View>
          <PrimaryButton
            label="Browse"
            onPress={() => router.push('/(tabs)/explore/internship')}
            style={styles.bannerButton}
          />
        </View>
      </Card>

      <SectionHeader
        title="Recommended for you"
        actionLabel="See all"
        onAction={() => router.push('/(tabs)/explore')}
      />
      <EmptyState
        icon="sparkles-outline"
        title="Personalized picks are coming"
        message="Add your university, skills and interests to your profile and we'll match opportunities to you."
        actionLabel="Set up my profile"
        onAction={() => router.push('/(tabs)/profile')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    gap: Spacing.two + 4,
  },
  bannerText: {
    gap: Spacing.one,
  },
  bannerButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    minHeight: 42,
    backgroundColor: '#ffffff',
  },
});
