import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface TextFieldProps<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

/**
 * RHF-backed form input (CLAUDE.md rule 10: RHF for all forms).
 * Muted fill, rounded, no focus ring — the background fill is enough affordance
 * and a coloured border on tap reads as "highlighted" rather than "active".
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: TextFieldProps<T>) {
  const colors = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <View style={styles.container}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <TextInput
            {...inputProps}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              { backgroundColor: colors.backgroundElement, color: colors.text },
            ]}
          />
          {fieldState.error && (
            <Text style={[styles.error, { color: colors.danger }]}>
              {fieldState.error.message}
            </Text>
          )}
        </View>
      )}
    />
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
  error: {
    fontSize: 13,
  },
});

