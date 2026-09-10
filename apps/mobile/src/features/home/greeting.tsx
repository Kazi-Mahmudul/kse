import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { greetingLabel } from '@/lib/greeting';

interface HomeGreetingProps {
  name: string;
}

/** "Good Morning, 👋" over the student's name (design 03._home_kse). */
export function HomeGreeting({ name }: HomeGreetingProps) {
  return (
    <View>
      <ThemedText themeColor="textSecondary" style={styles.greeting}>
        {greetingLabel()}, 👋
      </ThemedText>
      <ThemedText themeColor="heading" style={styles.name} numberOfLines={1}>
        {name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  name: {
    fontFamily: FontFamilies.bold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
});
