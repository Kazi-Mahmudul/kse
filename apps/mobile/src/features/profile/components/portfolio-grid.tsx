import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionHeader } from '@/components/ui/section-header';
import { FontFamilies } from '@/constants/theme';
import {
  useMyAchievements,
  useMyCertificates,
  useMyProjects,
  useMyResearch,
} from '@/features/portfolio/queries';
import { useTints } from '@/hooks/use-tints';
import type { IconName } from '@/types/icon';

interface TileSpec {
  key: string;
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
 */
export function PortfolioGrid() {
  const tints = useTints();
  const projectsQ = useMyProjects();
  const certificatesQ = useMyCertificates();
  const achievementsQ = useMyAchievements();
  const researchQ = useMyResearch();

  const counts: Record<string, number | undefined> = {
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
            <View key={tile.key} style={styles.tile}>
              <View
                style={[
                  styles.iconPill,
                  { backgroundColor: tint.bg },
                ]}
              >
                <Ionicons name={tile.icon} size={16} color={tint.fg} />
              </View>
              <ThemedText themeColor="textSecondary" style={styles.tileLabel}>
                {tile.label}
              </ThemedText>
              <ThemedText themeColor="heading" style={styles.tileCount}>
                {tile.count == null ? '—' : tile.count}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'surfaceMuted',
    borderWidth: 1,
    borderColor: 'border',
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});
