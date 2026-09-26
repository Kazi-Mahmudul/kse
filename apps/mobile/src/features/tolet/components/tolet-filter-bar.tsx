import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import {
  TOLET_GENDER_PREFERENCE_LABELS,
  TOLET_LISTING_STATUS_LABELS,
  TOLET_ROOM_TYPE_LABELS,
} from '@kse/shared';
import {
  TOLET_GENDER_PREFERENCES,
  TOLET_LISTING_STATUSES,
  TOLET_ROOM_TYPES,
  type ToletFacet,
  type ToletFilters,
} from '@kse/types';

interface ToletFilterBarProps {
  filters: ToletFilters;
  onChange: (patch: Partial<ToletFilters>) => void;
  facets?: ToletFacet;
}

const SORT_OPTIONS: { label: string; value: NonNullable<ToletFilters['sort']> }[] = [
  { label: 'Most recent', value: 'recent' },
  { label: 'Rent: low → high', value: 'rent_asc' },
  { label: 'Rent: high → low', value: 'rent_desc' },
];

/**
 * Bachelor To-Let filter chip rows. Mirrors `OpportunityFilterBar`'s
 * vertical-rows-of-chips shape but renders the housing-specific axes:
 * room type, gender preference, listing status, bachelor-friendly, city/area,
 * sort.
 */
export function ToletFilterBar({ filters, onChange, facets }: ToletFilterBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Chip
          label="All rooms"
          selected={!filters.roomType}
          onPress={() => onChange({ roomType: undefined })}
        />
        {TOLET_ROOM_TYPES.map((roomType) => (
          <Chip
            key={roomType}
            label={TOLET_ROOM_TYPE_LABELS[roomType]}
            selected={filters.roomType === roomType}
            onPress={() =>
              onChange({ roomType: filters.roomType === roomType ? undefined : roomType })
            }
          />
        ))}
      </View>

      <View style={styles.row}>
        <Chip
          label="Any gender"
          selected={!filters.gender}
          onPress={() => onChange({ gender: undefined })}
        />
        {TOLET_GENDER_PREFERENCES.map((gender) => (
          <Chip
            key={gender}
            label={TOLET_GENDER_PREFERENCE_LABELS[gender]}
            selected={filters.gender === gender}
            onPress={() =>
              onChange({ gender: filters.gender === gender ? undefined : gender })
            }
          />
        ))}
      </View>

      <View style={styles.row}>
        <Chip
          label="Any status"
          selected={!filters.listingStatus}
          onPress={() => onChange({ listingStatus: undefined })}
        />
        {TOLET_LISTING_STATUSES.map((status) => (
          <Chip
            key={status}
            label={TOLET_LISTING_STATUS_LABELS[status]}
            selected={filters.listingStatus === status}
            onPress={() =>
              onChange({
                listingStatus:
                  filters.listingStatus === status ? undefined : status,
              })
            }
          />
        ))}
      </View>

      <View style={styles.row}>
        <Chip
          label="Bachelor friendly"
          selected={filters.bachelorFriendly === true}
          onPress={() =>
            onChange({ bachelorFriendly: filters.bachelorFriendly === true ? undefined : true })
          }
        />
        <Chip
          label="Small unit (≤3 rooms)"
          selected={filters.maxTotalRooms === 3}
          onPress={() =>
            onChange({ maxTotalRooms: filters.maxTotalRooms === 3 ? undefined : 3 })
          }
        />
      </View>

      {facets?.cities && facets.cities.length > 0 ? (
        <View style={styles.row}>
          <Chip
            label="All cities"
            selected={!filters.city}
            onPress={() => onChange({ city: undefined })}
          />
          {facets.cities.map((city) => (
            <Chip
              key={city.value}
              label={`${city.value} (${city.count})`}
              selected={filters.city === city.value}
              onPress={() =>
                onChange({ city: filters.city === city.value ? undefined : city.value })
              }
            />
          ))}
        </View>
      ) : null}

      {facets?.areas && facets.areas.length > 0 && filters.city ? (
        <View style={styles.row}>
          <Chip
            label="All areas"
            selected={!filters.area}
            onPress={() => onChange({ area: undefined })}
          />
          {facets.areas
            .filter((area) => !filters.city || true)
            .slice(0, 8)
            .map((area) => (
              <Chip
                key={area.value}
                label={`${area.value} (${area.count})`}
                selected={filters.area === area.value}
                onPress={() =>
                  onChange({ area: filters.area === area.value ? undefined : area.value })
                }
              />
            ))}
        </View>
      ) : null}

      <View style={styles.row}>
        {SORT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={(filters.sort ?? 'recent') === option.value}
            onPress={() => onChange({ sort: option.value })}
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
    gap: Spacing.one,
  },
});
