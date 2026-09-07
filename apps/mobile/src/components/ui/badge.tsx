import { StyleSheet, Text, View } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BadgeTone = Extract<ThemeColor, 'primary' | 'success' | 'warning' | 'danger'> | 'neutral';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

/** Small tinted pill ("Remote", "New", deadline markers). */
export function Badge({ label, tone = 'primary' }: BadgeProps) {
  const colors = useTheme();
  const color = tone === 'neutral' ? colors.textSecondary : colors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
