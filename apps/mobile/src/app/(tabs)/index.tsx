import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/service';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

/**
 * Placeholder home — the real feed (recommended opportunities, quick access)
 * arrives with step 6+. Proves the auth loop end to end.
 */
export default function HomeScreen() {
  const colors = useTheme();
  const session = useAuthStore((s) => s.session);
  const email = session?.user.email ?? 'student';
  const firstName = email.split('@')[0];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <AnimatedIcon />
          <ThemedText type="title">Hi {firstName} 👋</ThemedText>
          <ThemedText type="default" style={{ color: colors.textSecondary }}>
            Signed in as {email}
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">You&apos;re all set</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            Your personalized opportunity feed is coming in the next step.
          </ThemedText>
        </ThemedView>

        <PrimaryButton
          label="Sign out"
          variant="outline"
          onPress={() => {
            void signOut();
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: Spacing.two,
  },
  card: {
    alignSelf: 'stretch',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    marginBottom: Spacing.two,
  },
});
