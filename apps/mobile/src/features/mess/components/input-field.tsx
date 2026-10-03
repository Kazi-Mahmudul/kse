import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface InputFieldProps extends TextInputProps {
  label: string;
}

/**
 * Controlled single-line input matching TextField's look (muted fill,
 * rounded, no focus ring) for sheet forms that keep plain useState instead
 * of react-hook-form.
 */
export function InputField({ label, style, ...inputProps }: InputFieldProps) {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
});
