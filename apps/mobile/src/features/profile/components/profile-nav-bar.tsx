import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Profile tab nav bar (design 05._profile_kse): centred "Profile" title with
 * a settings gear on the right that routes to the edit screen. No back
 * arrow — `/profile` is a tab destination.
 */
export function ProfileNavBar() {
  const colors = useTheme();
  const openSettings = () => router.push('/(tabs)/profile/edit');

  return (
    <View style={styles.nav}>
      {/* Left spacer balances the right-side gear so the title stays centred. */}
      <View style={styles.spacer} />
      <ThemedText themeColor="heading" style={styles.title}>Profile</ThemedText>
      <Pressable
        onPress={openSettings}
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
        hitSlop={8}
        style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
      >
        <Ionicons name="settings-outline" size={20} color={colors.bodyStrong} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  spacer: {
    width: 36,
    height: 36,
  },
  title: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: 'heading',
  },
  gear: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
