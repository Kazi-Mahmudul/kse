import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** Pill filter chip — selected fills with the brand primary (tokens "Patterns"). */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.backgroundElement,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? colors.onPrimary : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    // Compact, fully-rounded pill. The fixed height keeps the pill shape
    // consistent when the chip lives inside a horizontal ScrollView whose
    // intrinsic height can change (e.g. when a sibling list re-sizes after
    // a filter changes the number of rows rendered below it).
    height: 34,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
});
