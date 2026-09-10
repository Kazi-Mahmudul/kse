import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { EventType } from '@kse/types';

interface EventThumbnailProps {
  /** When set, render the real image instead of the type-themed tile. */
  imageUrl: string | null;
  eventType: EventType | null;
}

/**
 * Decorative 84×84 tile shown on the left of an Event card. The spec
 * (`08._events_kse`) renders a gradient + blur-orbs + category icon keyed
 * off the event sub-type, since most published events don't carry an
 * organization logo. When the admin supplies a real image we fall back to
 * it.
 *
 * No `react-native-linear-gradient` dependency — the "gradient" is two
 * overlapping absolutely-positioned translucent circles over a solid deep
 * base. Reads as a soft glow on both light and dark chrome.
 */

type EventPalette = {
  base: string; // deep base
  orb: string; // primary accent orb (top-left)
  orb2: string; // secondary accent orb (bottom-right)
};

const PALETTES: Record<EventType | 'default', EventPalette> = {
  workshop: {
    base: '#1E1B4B', // indigo-950
    orb: 'rgba(99, 102, 241, 0.55)', // indigo-500
    orb2: 'rgba(14, 165, 233, 0.40)', // sky-500
  },
  seminar: {
    base: '#3B0764', // purple-950
    orb: 'rgba(168, 85, 247, 0.55)', // purple-500
    orb2: 'rgba(236, 72, 153, 0.35)', // pink-500
  },
  hackathon: {
    base: '#4A044E', // fuchsia-950
    orb: 'rgba(217, 70, 239, 0.55)', // fuchsia-500
    orb2: 'rgba(59, 130, 246, 0.40)', // blue-500
  },
  meetup: {
    base: '#042F2E', // teal-950
    orb: 'rgba(20, 184, 166, 0.55)', // teal-500
    orb2: 'rgba(34, 197, 94, 0.35)', // green-500
  },
  default: {
    base: '#0F172A', // slate-900
    orb: 'rgba(99, 102, 241, 0.50)',
    orb2: 'rgba(14, 165, 233, 0.35)',
  },
};

const ICONS: Record<EventType | 'default', keyof typeof Ionicons.glyphMap> = {
  workshop: 'construct-outline',
  seminar: 'mic-outline',
  hackathon: 'rocket-outline',
  meetup: 'people-outline',
  default: 'calendar-outline',
};

export function EventThumbnail({ imageUrl, eventType }: EventThumbnailProps) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.tile}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const palette = PALETTES[eventType ?? 'default'];
  const iconName = ICONS[eventType ?? 'default'];

  return (
    <View style={[styles.tile, { backgroundColor: palette.base }]}>
      <View
        style={[
          styles.orb,
          styles.orbTopLeft,
          { backgroundColor: palette.orb },
        ]}
      />
      <View
        style={[
          styles.orb,
          styles.orbBottomRight,
          { backgroundColor: palette.orb2 },
        ]}
      />
      <Ionicons
        name={iconName}
        size={32}
        color="rgba(255,255,255,0.92)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  orbTopLeft: {
    top: -10,
    left: -10,
  },
  orbBottomRight: {
    bottom: -16,
    right: -16,
  },
});
