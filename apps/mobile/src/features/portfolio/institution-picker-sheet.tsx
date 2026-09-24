import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SearchBar } from '@/components/ui/search-bar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { institutionTypesForLevel } from '@/features/portfolio/institutions';
import { useInstitutionsInfinite } from '@/features/portfolio/institution-queries';
import { blurActiveElement } from '@/lib/focus';
import { alertDialog } from '@/lib/confirm';
import type { EducationInstitution } from '@kse/types';

import { InstitutionRequestSheet } from './institution-request-sheet';

export interface InstitutionPickerResult {
  id: string;
  name: string;
  city: string | null;
  area: string | null;
}

interface InstitutionPickerSheetProps {
  visible: boolean;
  level: string | null;
  /** District the student picked (Khulna for now, others when their seed
   *  data lands). null = no district filter. */
  district: string | null;
  onClose(): void;
  onSelect(result: InstitutionPickerResult): void;
}

/**
 * Bottom-sheet style picker for choosing an institution. Filters by
 * EducationLevel → institution type(s) + the student's district, and
 * supports a debounced substring search on name. Pagination is via
 * "Load more".
 */
export function InstitutionPickerSheet({
  visible,
  level,
  district,
  onClose,
  onSelect,
}: InstitutionPickerSheetProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const types = useMemo(() => institutionTypesForLevel(level), [level]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [requestOpen, setRequestOpen] = useState(false);

  // Reset the search box every time the sheet reopens so the user doesn't
  // see stale results from a previous selection. Avoids the React anti-pattern
  // of "set state inside an effect" by deriving the next value off the
  // previous render's `visible` instead of mutating in a layout effect.
  const [lastVisible, setLastVisible] = useState(visible);
  if (visible && !lastVisible) {
    setSearch('');
  }
  if (visible !== lastVisible) {
    setLastVisible(visible);
  }

  const query = useInstitutionsInfinite({
    types,
    city: district ?? null,
    search: debouncedSearch,
  });

  const rows: EducationInstitution[] = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => page.rows);
  }, [query.data]);

  const isLoading = query.isLoading;
  const isError = query.isError;

  return (
    <Modal visible={visible && !requestOpen} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
        onPress={onClose}
      >
        <ThemedView
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={styles.header}>
            <ThemedText type="smallBold">Choose institution</ThemedText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name (e.g. খুলনা / Khulna)…"
            variant="card"
          />

          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {district ? `${district} · ` : ''}
              {types
                .map((t) => t.replace(/_/g, ' '))
                .join(' · ')}
            </Text>
          </View>

          {isError ? (
            <View style={styles.stateRow}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={[styles.stateText, { color: colors.danger }]}>
                Could not load institutions.
              </Text>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.stateRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                Loading institutions…
              </Text>
            </View>
          ) : null}

          {!isLoading && !isError && rows.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="school-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No institutions found
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Can&apos;t see your school or college?
              </Text>
              <Pressable
                onPress={() => {
                  blurActiveElement();
                  setRequestOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Request a new institution"
                style={({ pressed }) => [
                  styles.requestButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.requestButtonLabel}>Request institution</Text>
              </Pressable>
            </View>
          ) : null}

          {rows.length > 0 ? (
            <View style={{ maxHeight: 360 }}>
              <FlatListLike>
                {rows.map((row) => (
                  <InstitutionRow
                    key={row.id}
                    row={row}
                    onPress={() => {
                      onSelect({
                        id: row.id,
                        name: row.name,
                        city: row.city,
                        area: row.area,
                      });
                      onClose();
                    }}
                  />
                ))}
              </FlatListLike>
              {query.hasNextPage ? (
                <Pressable
                  onPress={() => {
                    query.fetchNextPage().catch(() => {
                      void alertDialog({
                        title: 'Could not load more',
                        message: 'Please check your connection and try again.',
                      });
                    });
                  }}
                  disabled={query.isFetchingNextPage}
                  style={({ pressed }) => [
                    styles.loadMore,
                    { borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                    {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              blurActiveElement();
              setRequestOpen(true);
            }}
            style={({ pressed }) => [styles.altRow, pressed && styles.pressed]}
          >
            <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.altRowText, { color: colors.primary }]}>
              প্রতিষ্ঠানটি খুঁজে পাওয়া যাচ্ছে না? Request institution
            </Text>
          </Pressable>
        </ThemedView>
      </Pressable>

      <InstitutionRequestSheet
        visible={requestOpen}
        level={level}
        district={district}
        onClose={() => setRequestOpen(false)}
        onSubmitted={(name) => {
          setRequestOpen(false);
          void alertDialog({
            title: 'Request submitted',
            message: `Thanks! We'll review "${name}" and add it once approved.`,
          });
        }}
      />
    </Modal>
  );
}

function InstitutionRow({
  row,
  onPress,
}: {
  row: EducationInstitution;
  onPress(): void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Select ${row.name}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
          {row.name}
        </Text>
        {(row.area ?? row.city) ? (
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {[row.area, row.city].filter(Boolean).join(', ')}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

/** Lightweight scroll wrapper — avoids pulling in FlatList for a fixed
 *  list size since the outer Modal handles scroll containment. */
function FlatListLike({ children }: { children: React.ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxHeight: '85%',
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  meta: {
    marginTop: -2,
  },
  metaText: {
    fontSize: 12,
  },
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    gap: Spacing.two,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  loadMore: {
    marginTop: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  stateText: {
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBody: {
    fontSize: 12,
    marginBottom: Spacing.two,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
    borderRadius: 999,
  },
  requestButtonLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
  },
  altRowText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
