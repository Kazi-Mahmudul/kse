import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { IconName } from '@/types/icon';
import type { Subject } from '@kse/types';

/** Subject → icon (design: Math %, Physics atom, Chemistry flask, English book). */
const SUBJECT_ICONS: [pattern: RegExp, icon: IconName][] = [
  [/math/i, 'calculator-outline'],
  [/physics/i, 'planet-outline'],
  [/chem/i, 'flask-outline'],
  [/bio/i, 'leaf-outline'],
  [/english/i, 'book-outline'],
  [/bangla/i, 'language-outline'],
  [/program|coding|c\b/i, 'code-slash-outline'],
  [/algorithm|data structure/i, 'git-network-outline'],
  [/object/i, 'cube-outline'],
  [/database/i, 'server-outline'],
  [/electronic|ict/i, 'hardware-chip-outline'],
  [/account/i, 'cash-outline'],
];

function iconFor(subjectName: string): IconName {
  for (const [pattern, icon] of SUBJECT_ICONS) {
    if (pattern.test(subjectName)) return icon;
  }
  return 'book-outline';
}

interface SubjectPillsProps {
  subjects: Subject[];
  /** Selected subject id; undefined = "All". */
  selectedId?: string;
  onSelect: (subjectId: string | undefined) => void;
}

/**
 * Subject category pills (design 10._tuition_finder_kse_2): horizontally
 * scrolling 48×48 rounded icon tiles with a label below. The active tile
 * fills with the indigo-50 tint + brand border; inactive tiles are white.
 */
export function SubjectPills({ subjects, selectedId, onSelect }: SubjectPillsProps) {
  const colors = useTheme();
  const tints = useTints();

  const pill = (
    key: string,
    label: string,
    icon: IconName,
    active: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.tile,
          {
            backgroundColor: active ? tints.indigo.bg : colors.background,
            borderColor: active ? tints.indigo.border : colors.border,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={active ? colors.primary : colors.textSecondary}
        />
      </View>
      <ThemedText
        themeColor={active ? 'primary' : 'textSecondary'}
        style={[styles.label, active && styles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {pill('all', 'All', 'apps-outline', selectedId == null, () => onSelect(undefined))}
      {subjects.map((subject) =>
        pill(
          subject.id,
          subject.name,
          iconFor(subject.name),
          selectedId === subject.id,
          () =>
            onSelect(selectedId === subject.id ? undefined : subject.id),
        ),
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three - 2,
    paddingVertical: Spacing.one,
  },
  pill: {
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.75,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
    maxWidth: 64,
    textAlign: 'center',
  },
  labelActive: {
    fontFamily: FontFamilies.semiBold,
  },
});
