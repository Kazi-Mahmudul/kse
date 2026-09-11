import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { SubjectPills } from '@/components/subject-pills';
import { ThemedText } from '@/components/themed-text';
import { TutorCard } from '@/components/tutor-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useSavedTutorIds,
  useSubjects,
  useTutorFeed,
  useToggleSavedTutor,
  type TutorSort,
} from '@/features/tuition/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { blurActiveElement } from '@/lib/focus';

const SORT_OPTIONS: { value: TutorSort; label: string }[] = [
  { value: 'popular', label: 'Most popular' },
  { value: 'fee_asc', label: 'Fee: low to high' },
  { value: 'fee_desc', label: 'Fee: high to low' },
];

/**
 * Tuition Finder (design 10._tuition_finder_kse_2): search + tune-filter row,
 * scrolling subject icon pills, and "Popular Tutors" cards with rating and
 * bookmark. Requests stay a contact form — no marketplace payments.
 */
export default function TuitionScreen() {
  const colors = useTheme();
  const [text, setText] = useState('');
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [sort, setSort] = useState<TutorSort>('popular');
  const [sortOpen, setSortOpen] = useState(false);
  const debouncedText = useDebouncedValue(text, 300);

  const q = debouncedText.trim() || undefined;
  const query = useTutorFeed({ q, subjectId, sort });
  const subjectsQuery = useSubjects();
  const savedQuery = useSavedTutorIds();
  const toggleSave = useToggleSavedTutor();

  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];
  const savedIds = new Set(savedQuery.data ?? []);
  const hasCriteria = Boolean(q || subjectId || sort !== 'popular');

  const clearAll = () => {
    setText('');
    setSubjectId(undefined);
    setSort('popular');
  };

  return (
    <Screen style={{ backgroundColor: colors.surfaceMuted }}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText themeColor="heading" style={styles.title}>
          Tuition Finder
        </ThemedText>
      </View>

      <SearchBar
        value={text}
        onChangeText={setText}
        placeholder="Search subject or tutor…"
        variant="card"
        onFilterPress={() => {
          // Drop the filter button's focus before the sheet mounts.
          blurActiveElement();
          setSortOpen(true);
        }}
      />

      {/* Pills + section header travel as one tight block so "Popular
          Tutors" starts directly under the subject tabs (8px), not one
          full Screen-gap step below. */}
      <View style={styles.sectionStart}>
        <SubjectPills
          subjects={subjectsQuery.data ?? []}
          selectedId={subjectId}
          onSelect={setSubjectId}
        />

        <SectionHeader
          compact
          title="Popular Tutors"
          actionLabel="My requests"
          onAction={() => router.push('/(tabs)/tuition-requests')}
        />
      </View>

      {query.isPending && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {query.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load tutors"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      )}

      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon="book-outline"
          title={hasCriteria ? 'No tutors match' : 'No tutors listed yet'}
          message={
            hasCriteria
              ? 'Try a different subject or clear the search.'
              : 'Verified tutors are added as they join KSE.'
          }
          actionLabel={hasCriteria ? 'Clear filters' : 'Refresh'}
          onAction={hasCriteria ? clearAll : () => query.refetch()}
        />
      )}

      {rows.length > 0 && (
        <View style={styles.list}>
          {rows.map((tutor) => (
            <TutorCard
              key={tutor.id}
              tutor={tutor}
              saved={savedIds.has(tutor.id)}
              onToggleSave={(tutorId) =>
                toggleSave.mutate({ tutorId, saved: savedIds.has(tutorId) })
              }
            />
          ))}
        </View>
      )}

      {query.hasNextPage && (
        <PrimaryButton
          label={query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          loading={query.isFetchingNextPage}
          onPress={() => query.fetchNextPage()}
        />
      )}

      <Modal
        visible={sortOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSortOpen(false)}
      >
        <Pressable
          style={[styles.sheetBackdrop, { backgroundColor: colors.scrim }]}
          onPress={() => setSortOpen(false)}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              Sort tutors
            </ThemedText>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setSort(option.value);
                  setSortOpen(false);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
              >
                <ThemedText themeColor={sort === option.value ? 'primary' : 'text'}>
                  {option.label}
                </ThemedText>
                {sort === option.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  back: {
    padding: Spacing.one,
    marginLeft: -Spacing.one + 2,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  sectionStart: {
    gap: Spacing.two,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  list: {
    gap: Spacing.three - 4,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  sheetTitle: {
    marginBottom: Spacing.one,
  },
  optionRow: {
    paddingVertical: Spacing.three - 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
