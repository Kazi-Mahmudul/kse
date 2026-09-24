import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionHeader } from '@/components/ui/section-header';
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useMyAchievements,
  useMyCertificates,
  useMyProjects,
  useMyResearch,
} from '@/features/portfolio/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { IconName } from '@/types/icon';

interface TileSpec {
  key: 'projects' | 'certificates' | 'achievements' | 'research';
  label: string;
  icon: IconName;
  tint: 'indigo' | 'cyan' | 'amber' | 'emerald';
  count: number | undefined;
}

const TILES: readonly Omit<TileSpec, 'count'>[] = [
  { key: 'projects', label: 'Projects', icon: 'folder-outline', tint: 'indigo' },
  { key: 'certificates', label: 'Certificates', icon: 'shield-checkmark-outline', tint: 'cyan' },
  { key: 'achievements', label: 'Achievements', icon: 'time-outline', tint: 'amber' },
  { key: 'research', label: 'Research', icon: 'flask-outline', tint: 'emerald' },
] as const;

/**
 * "My Portfolio" 4-up metric grid (design 05._profile_kse). Each tile shows
 * the live count from the matching portfolio hook, with `—` placeholders
 * while the query is in flight so the row doesn't reflow on hydration.
 *
 * Tapping a tile deep-links to `/(tabs)/portfolio?scrollTo=<kind>`. The
 * portfolio hub honors that param on mount and scrolls to the matching
 * section, so a tap on "Projects" lands the user in the Projects editor.
 *
 * The previous version passed the string literals `'surfaceMuted'` and
 * `'border'` to `backgroundColor` / `borderColor`, which are not CSS
 * color values — Android fell back to a hard default hairline (the
 * "black border" bug). These now read from the theme.
 */
export function PortfolioGrid() {
  const colors = useTheme();
  const tints = useTints();
  const projectsQ = useMyProjects();
  const certificatesQ = useMyCertificates();
  const achievementsQ = useMyAchievements();
  const researchQ = useMyResearch();

  const counts: Record<TileSpec['key'], number | undefined> = {
    projects: projectsQ.data?.length,
    certificates: certificatesQ.data?.length,
    achievements: achievementsQ.data?.length,
    research: researchQ.data?.length,
  };

  const tiles: TileSpec[] = TILES.map((t) => ({ ...t, count: counts[t.key] }));

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="My Portfolio"
        actionLabel="See All"
        onAction={() => router.push('/(tabs)/portfolio')}
      />
      <View style={styles.grid}>
        {tiles.map((tile) => {
          const tint = tints[tile.tint];
          return (
            <Pressable
              key={tile.key}
              accessibilityRole="button"
              accessibilityLabel={`${tile.label}: ${tile.count ?? 0} items. Open in portfolio.`}
              onPress={() =>
                router.push({ pathname: '/(tabs)/portfolio', params: { scrollTo: tile.key } })
              }
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
                pressed && styles.tilePressed,
              ]}
            >
              <View style={[styles.iconPill, { backgroundColor: tint.bg }]}>
                <Ionicons name={tile.icon} size={16} color={tint.fg} />
              </View>
              <ThemedText themeColor="textSecondary" style={styles.tileLabel}>
                {tile.label}
              </ThemedText>
              <ThemedText themeColor="heading" style={styles.tileCount}>
                {tile.count == null ? '—' : tile.count}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two + 2, // 10px — matches SectionHeader breathing room
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three - 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  tilePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 10,
    lineHeight: 13,
  },
  tileCount: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 16,
    marginTop: 2,
    letterSpacing: -0.2,
  },
});
