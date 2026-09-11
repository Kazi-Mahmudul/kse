import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMemberCount } from '@/features/communities/format';
import type { CommunityListItem } from '@kse/types';

interface CommunityTileCardProps {
  community: CommunityListItem;
}

interface AvatarPalette {
  background: string;
  /** Override initials fallback when the slug hash lands on a code-style icon
   *  (e.g. `kuet-programming-club` → `<>` glyph). Undefined → plain initials. */
  icon?: 'code' | 'university';
}

// Deliberately fixed hex values — these are *community brand colors* (data),
// not chrome. They survive light/dark mode so every workspace reads the same
// across the app, matching the "Slack channel" mental model.
const AVATAR_PALETTE: AvatarPalette[] = [
  { background: '#2563EB' }, // blue-600
  { background: '#10B981' }, // emerald-500
  { background: '#0D9488' }, // teal-600
  { background: '#6366F1' }, // indigo-500
  { background: '#A855F7' }, // purple-500
  { background: '#F59E0B' }, // amber-500
  { background: '#EF4444' }, // red-500
  { background: '#06B6D4' }, // cyan-500
];

const CODE_TOKENS = ['programming', 'dev', 'code', 'cs', 'cse'];
const UNI_TOKENS = ['university', 'ku', 'kuet', 'uni', 'college'];

function paletteFor(slug: string, name: string): AvatarPalette {
  const haystack = `${slug} ${name}`.toLowerCase();
  if (CODE_TOKENS.some((t) => haystack.includes(t))) {
    return { background: '#10B981', icon: 'code' };
  }
  if (UNI_TOKENS.some((t) => haystack.includes(t))) {
    return { background: '#0D9488', icon: 'university' };
  }
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function avatarLabel(slug: string, name: string, palette: AvatarPalette): string {
  if (palette.icon) return '';
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('')
      .slice(0, 3);
  }
  return slug.slice(0, 2).toUpperCase();
}

/**
 * Compact community card for the Community tab "Your Communities"
 * 2x2 grid (spec 09._community_kse).
 *
 * Chrome is delegated to the shared `<Card tint="background">` so dark mode
 * + border + elevation all resolve from the theme tokens automatically. The
 * 36×36 colored avatar is the only piece of *data* — it stays fixed so each
 * community reads the same regardless of color scheme.
 *
 * Layout:
 *   ┌────────────────────┐
 *   │ [AA]  Title        │
 *   │        Subtitle    │
 *   │ ─────────────────  │
 *   │ 1.2K Members       │
 *   └────────────────────┘
 */
export function CommunityTileCard({ community }: CommunityTileCardProps) {
  const colors = useTheme();
  const palette = paletteFor(community.slug, community.name);
  const label = avatarLabel(community.slug, community.name, palette);

  const open = () =>
    router.push({
      pathname: '/(tabs)/community/[id]',
      params: { id: community.id },
    });

  return (
    <Card
      tint="background"
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Open ${community.name}`}
      style={[
        styles.tile,
        {
          borderColor: colors.border,
          boxShadow: `0px 4px 8px ${colors.shadow}`,
        },
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.avatar, { backgroundColor: palette.background }]}>
          {palette.icon === 'code' ? (
            <Ionicons name="code-slash-outline" size={18} color="#FFFFFF" />
          ) : palette.icon === 'university' ? (
            <Ionicons name="business-outline" size={18} color="#FFFFFF" />
          ) : (
            <ThemedText
              style={[styles.avatarLabel, { fontSize: label.length > 2 ? 10 : 12 }]}
            >
              {label}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
          {community.name}
        </ThemedText>
        {community.universityName ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={styles.subtitle}
          >
            {community.universityName}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.memberLine}>
          {formatMemberCount(community.memberCount)} Members
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 132,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'space-between',
    elevation: 1,
  },
  head: {
    marginBottom: Spacing.two,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamilies.bold,
    letterSpacing: -0.2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
  footer: {
    marginTop: Spacing.two,
  },
  memberLine: {
    fontSize: 10,
    lineHeight: 14,
  },
});
