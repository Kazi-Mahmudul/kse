import type { Href } from 'expo-router';

import type { OpportunityType } from '@kse/types';
import type { IconName } from '@/types/icon';

/** Explore sections (spec §32). Slugs double as route params. */
export interface ExploreCategory {
  slug:
    | 'internship'
    | 'scholarship'
    | 'event'
    | 'workshop'
    | 'tuition'
    | 'mentorship'
    | 'tolet'
    | 'hub'
    | 'books'
    | 'research';
  label: string;
  description: string;
  icon: IconName;
  tint: 'primary' | 'success' | 'warning' | 'danger';
  /** When set, the hub row shows the live count for this source — an
   *  opportunity type (published count), the verified-tutor count, or one
   *  of the Student Hub community counts. */
  countKey?:
    | OpportunityType
    | 'tutors'
    | 'hub_listings'
    | 'books'
    | 'research';
  /** Static route for entries that live outside `/(tabs)/explore/[type]`
   *  (the Student Hub stack). Falls back to the `[type]` route otherwise. */
  href?: Href;
}

export const EXPLORE_CATEGORIES: ExploreCategory[] = [
  {
    slug: 'internship',
    label: 'Internships',
    description: 'Launch your career',
    icon: 'briefcase-outline',
    tint: 'primary',
    countKey: 'internship',
  },
  {
    slug: 'scholarship',
    label: 'Scholarships',
    description: 'Fund your studies',
    icon: 'school-outline',
    tint: 'success',
    countKey: 'scholarship',
  },
  {
    slug: 'tolet',
    label: 'Bachelor To-Let',
    description: 'Rooms & sublets near campus',
    icon: 'home-outline',
    tint: 'primary',
    countKey: 'tolet',
  },
  {
    slug: 'event',
    label: 'Events',
    description: 'Meetups & seminars',
    icon: 'calendar-outline',
    tint: 'danger',
    countKey: 'event',
  },
  {
    slug: 'workshop',
    label: 'Workshops',
    description: 'Learn new skills',
    icon: 'construct-outline',
    tint: 'warning',
    countKey: 'workshop',
  },
  // Tuition uses a separate tutor-discovery workflow (spec §6) — its count
  // comes from the tutors table, not opportunities.
  {
    slug: 'tuition',
    label: 'Tuition',
    description: 'Find a tutor',
    icon: 'book-outline',
    tint: 'primary',
    countKey: 'tutors',
  },
  {
    slug: 'mentorship',
    label: 'Mentorship',
    description: 'Grow with a mentor',
    icon: 'people-circle-outline',
    tint: 'success',
    countKey: 'mentorship',
  },
  // Student Hub lives in its own stack (`/hub/…`), not `explore/[type]`.
  {
    slug: 'hub',
    label: 'Student Hub',
    description: 'Local services, shops & student deals',
    icon: 'apps-outline',
    tint: 'primary',
    countKey: 'hub_listings',
    href: '/hub',
  },
  {
    slug: 'books',
    label: 'Book Exchange',
    description: 'Swap, sell or give away used books',
    icon: 'swap-horizontal-outline',
    tint: 'success',
    countKey: 'books',
    href: '/hub/book-exchange',
  },
  {
    slug: 'research',
    label: 'Research Partners',
    description: 'Find a collaborator for your project',
    icon: 'flask-outline',
    tint: 'warning',
    countKey: 'research',
    href: '/hub/research',
  },
];

export function findCategory(slug: string): ExploreCategory | undefined {
  return EXPLORE_CATEGORIES.find((c) => c.slug === slug);
}
