import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, type TintKey } from '@/constants/theme';
import {
  useMyAchievements,
  useMyCertificates,
  useMyPortfolioLinks,
  useMyProjects,
  useMyResearch,
  useMyResumes,
} from '@/features/portfolio/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { IconName } from '@/types/icon';

interface TileSpec {
  key: string;
  label: string;
  icon: IconName;
  tint: TintKey;
}

/** Same tile set as the item-card badges (items.tsx SPECS) — one identity per kind. */
const PORTFOLIO_TILES: readonly TileSpec[] = [
  { key: 'projects', label: 'Projects', icon: 'folder-open-outline', tint: 'indigo' },
  { key: 'certificates', label: 'Certificates', icon: 'shield-checkmark-outline', tint: 'cyan' },
  { key: 'achievements', label: 'Achievements', icon: 'trophy-outline', tint: 'amber' },
  { key: 'research', label: 'Research', icon: 'flask-outline', tint: 'emerald' },
  { key: 'resumes', label: 'Resumes', icon: 'document-text-outline', tint: 'purple' },
  { key: 'links', label: 'Links', icon: 'link-outline', tint: 'sky' },
] as const;

/**
 * Portfolio overview strip — a 2×3 grid of live per-kind counts in the
 * profile "My Portfolio" tile language (design 05._profile_kse). Counts
 * render `—` while in flight so the grid doesn't reflow on hydration;
 * the grid always shows, giving the page a stable skeleton.
 */
export function PortfolioOverview() {
  const colors = useTheme();
  const tints = useTints();
  const projectsQ = useMyProjects();
  const certificatesQ = useMyCertificates();
  const achievementsQ = useMyAchievements();
  const researchQ = useMyResearch();
  const resumesQ = useMyResumes();
  const linksQ = useMyPortfolioLinks();

  const counts: Record<string, number | undefined> = {
    projects: projectsQ.data?.length,
    certificates: certificatesQ.data?.length,
    achievements: achievementsQ.data?.length,
    research: researchQ.data?.length,
    resumes: resumesQ.data?.length,
    links: linksQ.data?.length,
  };

  return (
    <View style={styles.grid}>
      {PORTFOLIO_TILES.map((tile) => {
        const tint = tints[tile.tint];
        const count = counts[tile.key];
        return (
          <View
            key={tile.key}
            style={[
              styles.tile,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <View style={[styles.iconPill, { backgroundColor: tint.bg }]}>
              <Ionicons name={tile.icon} size={16} color={tint.fg} />
            </View>
            <ThemedText themeColor="textSecondary" style={styles.tileLabel}>
              {tile.label}
            </ThemedText>
            <ThemedText themeColor="heading" style={styles.tileCount}>
              {count == null ? '—' : count}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    // 2 columns: (tile + gap) × 2 leaves just under half the width per tile.
    width: '48.5%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
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
