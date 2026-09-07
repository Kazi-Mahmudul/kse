import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import type {
  OpportunityCategoryInfo,
  OpportunityFilters,
} from '@/features/opportunities/service';
import { OPPORTUNITY_MODES, OPPORTUNITY_TYPES } from '@kse/types';
import {
  OPPORTUNITY_MODE_LABELS,
  OPPORTUNITY_TYPE_LABELS,
} from '@kse/shared';

const DEADLINE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Any deadline', days: null },
  { label: 'This week', days: 7 },
  { label: 'This month', days: 30 },
];

interface OpportunityFilterBarProps {
  filters: OpportunityFilters;
  onChange: (patch: Partial<OpportunityFilters>) => void;
  /** Type chips only on the search screen — type lists already fix the type. */
  showType?: boolean;
  /** Type-scoped category chips when a listing wants them (spec §6). */
  categories?: OpportunityCategoryInfo[];
}

/** Horizontal chip rows for category / type / mode / deadline. Chips toggle off. */
export function OpportunityFilterBar({
  filters,
  onChange,
  showType = false,
  categories,
}: OpportunityFilterBarProps) {
  return (
    <View style={styles.wrap}>
      {categories && categories.length > 0 && (
        <View style={styles.row}>
          <Chip
            label="All categories"
            selected={!filters.categoryId}
            onPress={() => onChange({ categoryId: undefined })}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={filters.categoryId === category.id}
              onPress={() =>
                onChange({
                  categoryId:
                    filters.categoryId === category.id ? undefined : category.id,
                })
              }
            />
          ))}
        </View>
      )}

      {showType && (
        <View style={styles.row}>
          <Chip
            label="All types"
            selected={!filters.type}
            onPress={() => onChange({ type: undefined })}
          />
          {OPPORTUNITY_TYPES.map((type) => (
            <Chip
              key={type}
              label={OPPORTUNITY_TYPE_LABELS[type]}
              selected={filters.type === type}
              onPress={() =>
                onChange({ type: filters.type === type ? undefined : type })
              }
            />
          ))}
        </View>
      )}

      <View style={styles.row}>
        <Chip
          label="Any mode"
          selected={!filters.mode}
          onPress={() => onChange({ mode: undefined })}
        />
        {OPPORTUNITY_MODES.map((mode) => (
          <Chip
            key={mode}
            label={OPPORTUNITY_MODE_LABELS[mode]}
            selected={filters.mode === mode}
            onPress={() =>
              onChange({ mode: filters.mode === mode ? undefined : mode })
            }
          />
        ))}
      </View>

      <View style={styles.row}>
        {DEADLINE_OPTIONS.map(({ label, days }) => (
          <Chip
            key={label}
            label={label}
            selected={filters.deadlineWithinDays === days}
            onPress={() =>
              onChange({
                deadlineWithinDays:
                  filters.deadlineWithinDays === days ? null : days,
              })
            }
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
});
