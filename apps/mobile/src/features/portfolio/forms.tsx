import { useState } from 'react';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface RHFInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'url' | 'email-address' | 'numeric';
}

/** Light-gray rounded RHF-backed text input. */
export function RHFInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  multiline,
  keyboardType,
}: RHFInputProps<T>) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <TextInput
            value={(value as string | undefined) ?? ''}
            onChangeText={onChange}
            onBlur={() => {
              setFocused(false);
              onBlur();
            }}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline={multiline}
            keyboardType={keyboardType}
            autoCapitalize={keyboardType === 'url' || keyboardType === 'email-address' ? 'none' : 'sentences'}
            style={[
              styles.input,
              multiline && styles.multiline,
              { backgroundColor: colors.backgroundElement, color: colors.text },
              focused && { borderColor: colors.primary, borderWidth: 1.5 },
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

interface RHFToggleProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export function RHFToggle<T extends FieldValues>({
  control,
  name,
  label,
}: RHFToggleProps<T>) {
  const colors = useTheme();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState }) => (
        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <Switch
            value={Boolean(value)}
            onValueChange={onChange}
            trackColor={{ false: colors.backgroundElement, true: colors.primary }}
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

interface RHFChipListProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
}

export function RHFChipList<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = 'Add and press return…',
}: RHFChipListProps<T>) {
  const colors = useTheme();
  const [draft, setDraft] = useState('');
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState }) => {
        const items = (Array.isArray(value) ? value : []) as string[];
        const add = () => {
          const trimmed = draft.trim();
          if (!trimmed || items.includes(trimmed)) return;
          onChange([...items, trimmed]);
          setDraft('');
        };
        const remove = (idx: number) => {
          onChange(items.filter((_, i) => i !== idx));
        };
        return (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
            {items.length > 0 && (
              <View style={styles.chipRow}>
                {items.map((chip, idx) => (
                  <Pressable
                    key={`${chip}-${idx}`}
                    onPress={() => remove(idx)}
                    accessibilityLabel={`Remove ${chip}`}
                  >
                    <Chip label={`${chip}  ✕`} selected />
                  </Pressable>
                ))}
              </View>
            )}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={add}
              autoCapitalize="none"
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
        );
      }}
    />
  );
}

/** Card-style error banner used on top of a section form. */
export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Card tint="danger">
      <ThemedText type="small" themeColor="background">
        {message}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
    marginBottom: Spacing.three,
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
    marginBottom: Spacing.two,
  },
  error: {
    fontSize: 13,
  },
});
