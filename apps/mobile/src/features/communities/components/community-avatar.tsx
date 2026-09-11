import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';

/**
 * Community brand avatar — the colored square users learn to recognize a
 * community by. Shared by the Community tab tile grid (36px) and the
 * community detail hero (56px) so both surfaces render the exact same
 * mark for a given community.
 */

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

interface CommunityAvatarProps {
  slug: string;
  name: string;
  /** Box size in dp — 36 for grid tiles, 56 for the detail hero. */
  size?: number;
  /** Corner radius — 12 for tiles, 16 for the hero. */
  radius?: number;
}

export function CommunityAvatar({ slug, name, size = 36, radius = 12 }: CommunityAvatarProps) {
  const palette = paletteFor(slug, name);
  const label = avatarLabel(slug, name, palette);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: palette.background,
        },
      ]}
    >
      {palette.icon === 'code' ? (
        <Ionicons name="code-slash-outline" size={Math.round(size / 2)} color="#FFFFFF" />
      ) : palette.icon === 'university' ? (
        <Ionicons name="business-outline" size={Math.round(size / 2)} color="#FFFFFF" />
      ) : (
        <ThemedText
          style={[
            styles.avatarLabel,
            {
              fontSize: Math.round((label.length > 2 ? 0.28 : 0.33) * size),
            },
          ]}
        >
          {label}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamilies.bold,
    letterSpacing: -0.2,
  },
});
