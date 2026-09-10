import type { Href } from 'expo-router';

import type { TintKey } from '@/constants/theme';
import type { IconName } from '@/types/icon';

export interface QuickAccessItem {
  key: string;
  label: string;
  icon: IconName;
  tint: TintKey;
  href: Href;
}

/**
 * Home "Quick Access" grid — 8 tiles in two rows of four, in the order and
 * with the pastel tints specified by design 03._home_kse. Every destination is
 * an existing route (spec §32 "Explore can contain…").
 */
export const QUICK_ACCESS: QuickAccessItem[] = [
  {
    key: 'internship',
    label: 'Internship',
    icon: 'briefcase-outline',
    tint: 'indigo',
    href: '/(tabs)/explore/internship',
  },
  {
    key: 'scholarship',
    label: 'Scholarship',
    icon: 'school-outline',
    tint: 'amber',
    href: '/(tabs)/explore/scholarship',
  },
  {
    key: 'tuition',
    label: 'Tuition',
    icon: 'book-outline',
    tint: 'sky',
    href: '/(tabs)/explore/tuition',
  },
  {
    key: 'workshop',
    label: 'Workshops',
    icon: 'desktop-outline',
    tint: 'purple',
    href: '/(tabs)/explore/workshop',
  },
  {
    key: 'event',
    label: 'Events',
    icon: 'calendar-outline',
    tint: 'fuchsia',
    href: '/(tabs)/explore/event',
  },
  {
    key: 'community',
    label: 'Community',
    icon: 'people-outline',
    tint: 'emerald',
    href: '/(tabs)/community',
  },
  {
    key: 'mentorship',
    label: 'Mentor',
    icon: 'person-outline',
    tint: 'teal',
    href: '/(tabs)/explore/mentorship',
  },
  {
    key: 'more',
    label: 'More',
    icon: 'ellipsis-horizontal',
    tint: 'slate',
    href: '/(tabs)/explore',
  },
];
