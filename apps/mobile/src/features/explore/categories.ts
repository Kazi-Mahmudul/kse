import type { OpportunityType } from '@kse/types';
import type { IconName } from '@/types/icon';

/** Explore sections (spec §32). Slugs double as route params. */
export interface ExploreCategory {
  slug: 'internship' | 'scholarship' | 'event' | 'workshop' | 'tuition' | 'mentorship';
  label: string;
  description: string;
  icon: IconName;
  tint: 'primary' | 'success' | 'warning' | 'danger';
  /** When set, the hub row shows the live published count for this type. */
  countKey?: OpportunityType;
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
  // Tuition uses a separate tutor-discovery workflow (spec §6) — no live count.
  {
    slug: 'tuition',
    label: 'Tuition',
    description: 'Find a tutor',
    icon: 'book-outline',
    tint: 'primary',
  },
  {
    slug: 'mentorship',
    label: 'Mentorship',
    description: 'Grow with a mentor',
    icon: 'people-circle-outline',
    tint: 'success',
    countKey: 'mentorship',
  },
];

export function findCategory(slug: string): ExploreCategory | undefined {
  return EXPLORE_CATEGORIES.find((c) => c.slug === slug);
}
