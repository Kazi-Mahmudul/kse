import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Pill search field (tokens "Shape"). Debouncing is the caller's job (spec §33). */
export function SearchBar({
  value,
  onChangeText,
  onSubmitEditing,
  placeholder = 'Search opportunities, tutors…',
  autoFocus = false,
}: SearchBarProps) {
  const colors = useTheme();

  return (
    <View style={[styles.bar, { backgroundColor: colors.backgroundElement }]}>
      <Ionicons name="search" size={18} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        style={[styles.input, { color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
