import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/service';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

/** Profile shell — the full editor (skills, portfolio, resume) is step 5. */
export default function ProfileScreen() {
  const colors = useTheme();
  const session = useAuthStore((s) => s.session);
  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string };
  const fullName = meta.full_name?.trim() || 'Student';
  const email = session?.user.email ?? '';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <ThemedText type="subtitle" themeColor="onPrimary">
            {initial}
          </ThemedText>
        </View>
        <View style={styles.identity}>
          <ThemedText type="subtitle">{fullName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {email}
          </ThemedText>
        </View>
        <Badge label="Student" tone="success" />
      </View>

      <Card onPress={() => router.push('/(tabs)/explore')}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}1A` }]}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <ThemedText type="smallBold">Edit profile</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              University, department, skills and interests — next update
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </Card>

      <SectionHeader title="My portfolio" />
      <EmptyState
        icon="folder-open-outline"
        title="Your portfolio starts here"
        message="Projects, certificates, achievements and research will be showcased on your profile."
      />

      <PrimaryButton
        label="Sign out"
        variant="outline"
        onPress={() => {
          void signOut();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
