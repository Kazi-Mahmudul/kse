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
 * Home "Quick Access" grid. The first eight tiles are the ones students use
 * day-to-day (two full rows of four); Events and Mentorship stay one tap
 * away behind the "See more" expander. Every destination is an existing
 * route (spec §32 "Explore can contain…").
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
    key: 'community',
    label: 'Community',
    icon: 'people-outline',
    tint: 'emerald',
    href: '/(tabs)/community',
  },
  {
    key: 'tolet',
    label: 'To-Let',
    icon: 'home-outline',
    tint: 'cyan',
    href: '/(tabs)/explore/tolet',
  },
  {
    key: 'hub',
    label: 'Student Hub',
    icon: 'apps-outline',
    tint: 'purple',
    href: '/hub' as Href,
  },
  {
    key: 'mess',
    label: 'Mess',
    icon: 'restaurant-outline',
    tint: 'amber',
    href: '/mess' as Href,
  },
  {
    key: 'workshop',
    label: 'Workshops',
    icon: 'desktop-outline',
    tint: 'purple',
    href: '/(tabs)/explore/workshop',
  },
  // ── Behind "See more" ────────────────────────────────────────────────────
  {
    key: 'event',
    label: 'Events',
    icon: 'calendar-outline',
    tint: 'fuchsia',
    href: '/(tabs)/explore/event',
  },
  {
    key: 'mentorship',
    label: 'Mentor',
    icon: 'person-outline',
    tint: 'teal',
    href: '/(tabs)/explore/mentorship',
  },
];
