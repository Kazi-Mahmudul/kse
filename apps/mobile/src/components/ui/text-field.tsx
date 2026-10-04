import { Ionicons } from '@expo/vector-icons';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface TextFieldProps<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /**
   * Render a show/hide eye toggle for password fields. Implies nothing on
   * its own — pass `secureTextEntry` alongside it; the toggle flips that
   * prop while typing.
   */
  showToggle?: boolean;
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
  showToggle = false,
  ...inputProps
}: TextFieldProps<T>) {
  const colors = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <View style={styles.container}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <View style={styles.inputRow}>
            <TextInput
              {...inputProps}
              secureTextEntry={showToggle && inputProps.secureTextEntry ? !visible : inputProps.secureTextEntry}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { backgroundColor: colors.backgroundElement, color: colors.text },
                showToggle && styles.inputWithToggle,
              ]}
            />
            {showToggle && inputProps.secureTextEntry ? (
              <Pressable
                onPress={() => setVisible((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={visible ? 'Hide password' : 'Show password'}
                hitSlop={8}
                style={styles.toggle}
              >
                <Ionicons
                  name={visible ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: 46,
  },
  toggle: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  error: {
    fontSize: 13,
  },
});
