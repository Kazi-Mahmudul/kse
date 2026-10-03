import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Tiny uppercase section caption — "TODAY", "BAZAR", "MY MESS STATUS". */
export function SectionLabel({ children, action }: { children: string; action?: string }) {
  const colors = useTheme();
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.label, { color: colors.textMuted }]}>{children}</ThemedText>
      {action ? <ThemedText style={[styles.action, { color: colors.primary }]}>{action}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  action: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
});
