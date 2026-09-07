import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IconName } from '@/types/icon';

const ACTIONS: {
  label: string;
  description: string;
  icon: IconName;
  href: Href;
}[] = [
  {
    label: 'My dashboard',
    description: 'Profile score, saved opportunities and upcoming deadlines',
    icon: 'grid-outline',
    href: '/(tabs)/dashboard',
  },
  {
    label: 'Browse internships',
    description: 'Curated internships from verified organizations',
    icon: 'briefcase-outline',
    href: '/(tabs)/explore/internship',
  },
  {
    label: 'Find scholarships',
    description: 'Local and international funding for your studies',
    icon: 'school-outline',
    href: '/(tabs)/explore/scholarship',
  },
  {
    label: 'Find a tutor',
    description: 'Verified tutors near your university',
    icon: 'book-outline',
    href: '/(tabs)/explore/tuition',
  },
  {
    label: 'Join a community',
    description: 'Student clubs and study groups around Khulna',
    icon: 'people-outline',
    href: '/(tabs)/community',
  },
];

/** Quick-action sheet opened from the center "+" in the tab bar. */
export default function CreateScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText type="subtitle">Quick actions</ThemedText>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.list}>
        {ACTIONS.map((action) => (
          <Card key={action.label} onPress={() => router.replace(action.href)}>
            <View style={styles.actionRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}1A` }]}>
                <Ionicons name={action.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.actionText}>
                <ThemedText type="smallBold">{action.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {action.description}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </Card>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  close: {
    padding: Spacing.one,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.two + 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
