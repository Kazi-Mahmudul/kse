import type { IconName } from '@/types/icon';

/** Explore sections (spec §32). Slugs double as route params. */
export interface ExploreCategory {
  slug: 'internship' | 'scholarship' | 'event' | 'workshop' | 'tuition' | 'mentorship';
  label: string;
  description: string;
  icon: IconName;
  tint: 'primary' | 'success' | 'warning' | 'danger';
}

export const EXPLORE_CATEGORIES: ExploreCategory[] = [
  {
    slug: 'internship',
    label: 'Internships',
    description: 'Launch your career',
    icon: 'briefcase-outline',
    tint: 'primary',
  },
  {
    slug: 'scholarship',
    label: 'Scholarships',
    description: 'Fund your studies',
    icon: 'school-outline',
    tint: 'success',
  },
  {
    slug: 'event',
    label: 'Events',
    description: 'Meetups & seminars',
    icon: 'calendar-outline',
    tint: 'danger',
  },
  {
    slug: 'workshop',
    label: 'Workshops',
    description: 'Learn new skills',
    icon: 'construct-outline',
    tint: 'warning',
  },
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
  },
];

export function findCategory(slug: string): ExploreCategory | undefined {
  return EXPLORE_CATEGORIES.find((c) => c.slug === slug);
}
