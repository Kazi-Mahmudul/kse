import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ProfileAvatarProps {
  /** Display name; first letters of the first two words are used as the fallback initials. */
  name: string | null;
  /** Optional remote image (`profiles.avatar_url`). When null/undefined the initials fallback renders. */
  url?: string | null;
  /** Outer diameter including the gradient ring. Default 80 — matches the design. */
  size?: number;
  /** Gradient ring thickness in px. Default 2. */
  ringSize?: number;
}

/**
 * Pick a fallback label from a display name: first letter of up to the first
 * two whitespace-separated words, upper-cased. Falls back to "?" when the
 * name is missing or contains no word characters (matches the design's spec
 * where an empty profile still renders something instead of a blank circle).
 */
function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/**
 * Profile avatar (design 05._profile_kse): brand→indigo-300 gradient ring
 * wrapping either a remote image (via `expo-image`) or a centred-initial
 * fallback. Single source of truth for the avatar look on the Profile tab.
 */
export function ProfileAvatar({
  name,
  url,
  size = 80,
  ringSize = 2,
}: ProfileAvatarProps) {
  const colors = useTheme();
  const innerSize = size - ringSize * 2;

  return (
    <LinearGradient
      colors={['#4F46E5', '#A5B4FC']} // brand-500 → indigo-300, fixed per spec
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: 999, padding: ringSize }}
    >
      <View
        style={[
          styles.innerRing,
          {
            width: innerSize,
            height: innerSize,
            backgroundColor: colors.background,
          },
        ]}
      >
        {url ? (
          <Image
            source={{ uri: url }}
            style={{ width: innerSize - 4, height: innerSize - 4, borderRadius: 999 }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View
            style={[
              styles.fallback,
              {
                width: innerSize - 4,
                height: innerSize - 4,
                backgroundColor: colors.primary,
              },
            ]}
          >
            <ThemedText themeColor="onPrimary" style={styles.initials}>
              {initialsOf(name)}
            </ThemedText>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  innerRing: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallback: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: FontFamilies.bold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
});
