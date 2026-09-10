import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/segmented-control';
import { FontFamilies, Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/service';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore, type ThemePreference } from '@/store/settings-store';

const THEME_OPTIONS: readonly SegmentedOption<ThemePreference>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Settings (step N): the new home for the app-wide dark/light toggle and
 * the previously orphaned sign-out. Reachable from the Profile tab gear
 * (see `profile-nav-bar.tsx`) and from the Home top-bar location pill.
 */
export default function SettingsScreen() {
  const colors = useTheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const email = useAuthStore((s) => s.session?.user.email) ?? '';

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to use KSE.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  return (
    <Screen>
      <BackHeader title="Settings" />

      <SectionLabel>Appearance</SectionLabel>
      <SegmentedControl
        options={THEME_OPTIONS}
        value={themePreference}
        onChange={setThemePreference}
      />
      <ThemedText type="small" themeColor="textMuted" style={styles.help}>
        Follow device or choose manually.
      </ThemedText>

      <SectionLabel>Account</SectionLabel>
      <View style={[styles.card, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <Pressable
          onPress={() => router.push('/(tabs)/profile/edit')}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
          <ThemedText themeColor="heading" style={styles.rowTitle}>
            Edit profile
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <Ionicons name="mail-outline" size={20} color={colors.bodyStrong} />
          <ThemedText themeColor="bodyStrong" style={styles.rowTitle}>
            {email || '—'}
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Pressable
          onPress={confirmSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <ThemedText style={[styles.rowTitle, { color: colors.danger }]}>
            Sign out
          </ThemedText>
        </Pressable>
      </View>

      <SectionLabel>About</SectionLabel>
      <View style={[styles.card, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <View style={styles.row}>
          <ThemedText themeColor="textSecondary" style={styles.aboutLabel}>
            App version
          </ThemedText>
          <ThemedText themeColor="bodyStrong" style={styles.rowTitle}>
            {Constants.expoConfig?.version ?? '1.0.0'}
          </ThemedText>
        </View>
      </View>
    </Screen>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="smallBold" style={styles.section}>
      {children}
    </ThemedText>
  );
}

function BackHeader({ title }: { title: string }) {
  const colors = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <ThemedText type="subtitle">{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  back: {
    padding: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  help: {
    marginTop: Spacing.two,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowTitle: {
    flex: 1,
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three + 20 + Spacing.three, // icon + gap + padding
  },
  aboutLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
  },
});
