import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, type TintKey } from '@/constants/theme';
import {
  useMyAchievements,
  useMyCertificates,
  useMyEducation,
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
  { key: 'education', label: 'Education', icon: 'school-outline', tint: 'teal' },
  { key: 'projects', label: 'Projects', icon: 'folder-open-outline', tint: 'indigo' },
  { key: 'certificates', label: 'Certificates', icon: 'shield-checkmark-outline', tint: 'cyan' },
  { key: 'achievements', label: 'Achievements', icon: 'trophy-outline', tint: 'amber' },
  { key: 'research', label: 'Research', icon: 'flask-outline', tint: 'emerald' },
  { key: 'resumes', label: 'Resumes', icon: 'document-text-outline', tint: 'purple' },
  { key: 'links', label: 'Links', icon: 'link-outline', tint: 'sky' },
] as const;

/** Strong-typed view of the tile keys we expose as scroll targets. */
export type TileKey = (typeof PORTFOLIO_TILES)[number]['key'];

/**
 * Portfolio overview strip — a grid of live per-kind counts in the
 * profile "My Portfolio" tile language (design 05._profile_kse). Counts
 * render `—` while in flight so the grid doesn't reflow on hydration;
 * the grid always shows, giving the page a stable skeleton.
 *
 * Tapping a tile scrolls the page to the matching section so users can
 * jump straight to the items of that kind without hunting.
 */
export function PortfolioOverview({
  onTilePress,
}: {
  onTilePress?(key: TileKey): void;
}) {
  const colors = useTheme();
  const tints = useTints();
  const educationQ = useMyEducation();
  const projectsQ = useMyProjects();
  const certificatesQ = useMyCertificates();
  const achievementsQ = useMyAchievements();
  const researchQ = useMyResearch();
  const resumesQ = useMyResumes();
  const linksQ = useMyPortfolioLinks();

  const counts: Record<string, number | undefined> = {
    education: educationQ.data?.length,
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
          <Pressable
            key={tile.key}
            onPress={onTilePress ? () => onTilePress(tile.key) : undefined}
            disabled={!onTilePress}
            accessibilityRole={onTilePress ? 'button' : undefined}
            accessibilityLabel={
              onTilePress
                ? `Jump to ${tile.label}, ${count == null ? 'loading' : count} items`
                : undefined
            }
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                boxShadow: `0px 1px 6px ${colors.shadow}`,
              },
              pressed && onTilePress && styles.pressed,
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
          </Pressable>
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
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
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
