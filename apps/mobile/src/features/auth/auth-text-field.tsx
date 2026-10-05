import { Ionicons } from '@expo/vector-icons';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { FontFamilies } from '@/constants/theme';

/**
 * Glass input for the auth screens: a translucent white fill + hairline
 * border that sits directly on the auth photograph. Deliberately NOT
 * themed — the photo is a dark surface in both light and dark mode, so
 * this one treatment stays readable and identical everywhere.
 *
 * States: rest (38% border), focused (solid white border), error (soft red
 * border + message), disabled (55% opacity). The optional eye toggle pairs
 * with `secureTextEntry`.
 */
export function AuthTextField<T extends FieldValues>({
  control,
  name,
  label,
  showToggle = false,
  ...inputProps
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  showToggle?: boolean;
} & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  const secure = showToggle && inputProps.secureTextEntry ? !visible : inputProps.secureTextEntry;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState }) => {
        const hasError = Boolean(fieldState.error);
        return (
          <View style={[styles.container, inputProps.editable === false && styles.disabled]}>
            <Text style={styles.label}>{label}</Text>
            <View
              style={[
                styles.inputRow,
                focused && styles.inputRowFocused,
                hasError && styles.inputRowError,
              ]}
            >
              <TextInput
                {...inputProps}
                secureTextEntry={secure}
                value={value}
                onChangeText={onChange}
                onFocus={(e) => {
                  setFocused(true);
                  inputProps.onFocus?.(e);
                }}
                onBlur={(e) => {
                  setFocused(false);
                  onBlur();
                  inputProps.onBlur?.(e);
                }}
                placeholderTextColor="rgba(255,255,255,0.62)"
                style={[styles.input, showToggle && styles.inputWithToggle]}
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
                    color="rgba(255,255,255,0.85)"
                  />
                </Pressable>
              ) : null}
            </View>
            {hasError && (
              <Text style={styles.error}>{fieldState.error?.message as string}</Text>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  inputRowFocused: {
    borderColor: '#ffffff',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  inputRowError: {
    borderColor: 'rgba(252,165,165,0.9)',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
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
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#FCA5A5',
  },
});
