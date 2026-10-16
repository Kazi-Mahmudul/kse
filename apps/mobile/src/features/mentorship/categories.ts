import type { MentorCategory } from './types';

export const MENTOR_CATEGORIES: MentorCategory[] = [
  {
    id: 'career-guidance',
    name: 'Career Guidance',
    slug: 'career',
    description: 'Career planning, internship, job preparation',
    icon: 'briefcase-outline',
    tint: 'indigo',
    tags: [
      'career',
      'interview-prep',
      'cv-review',
      'freelancing',
      'backend',
      'system-design',
      'react-native',
      'mobile',
      'ux-design',
    ],
  },
  {
    id: 'scholarship-guidance',
    name: 'Scholarship Guidance',
    slug: 'scholarship',
    description: 'Profile review, SOP, CV, application support',
    icon: 'school-outline',
    tint: 'emerald',
    tags: ['scholarship', 'higher-studies', 'ielts', 'english', 'research'],
  },
  {
    id: 'research-publication',
    name: 'Research & Publication',
    slug: 'research',
    description: 'Research topic, paper writing, journal selection',
    icon: 'document-text-outline',
    tint: 'sky',
    tags: ['research', 'higher-studies', 'data-science', 'analytics'],
  },
  {
    id: 'research-partners',
    name: 'Research Partners',
    slug: 'partners',
    description: 'Find research collaborators, academic network',
    icon: 'people-outline',
    tint: 'fuchsia',
    tags: ['research', 'partner', 'higher-studies', 'system-design', 'data-science'],
  },
  {
    id: 'tuition-academic-support',
    name: 'Tuition & Academic Support',
    slug: 'tuition',
    description: 'Subject help, study plan, exam preparation',
    icon: 'book-outline',
    tint: 'purple',
    tags: ['tuition', 'academic', 'english', 'ielts'],
    serviceRoute: '/(tabs)/explore/tuition',
  },
];

export function findMentorCategory(slugOrId: string): MentorCategory | undefined {
  return MENTOR_CATEGORIES.find(
    (c) => c.slug === slugOrId || c.id === slugOrId,
  );
}
