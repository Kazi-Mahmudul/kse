interface CompletionProfile {
  full_name: string | null;
  bio: string | null;
  university_id: string | null;
  department_id: string | null;
  academic_level: string | null;
  phone: string | null;
  interests: string[];
  has_cgpa?: boolean;
  has_research?: boolean;
  has_project?: boolean;
  has_publication?: boolean;
  has_test_score?: boolean;
  has_activity?: boolean;
  has_primary_resume?: boolean;
}

/**
 * Each entry is one requirement; the boolean is whether the profile
 * satisfies it. The Scholarship Match feature reads the same shape to
 * surface "Profile completeness for scholarships" on the Scholarship
 * Hub (the score itself stays identical to the home page card so the
 * two surfaces can't drift).
 */
export interface ProfileCompletionCheck {
  id:
    | 'name'
    | 'bio'
    | 'university'
    | 'department'
    | 'academic_level'
    | 'phone'
    | 'interests'
    | 'skills'
    | 'cgpa'
    | 'research'
    | 'projects'
    | 'publications'
    | 'test_scores'
    | 'activities'
    | 'primary_resume';
  label: string;
  /** True when the profile already satisfies the requirement. */
  done: boolean;
  /** Route the user to in order to fix a missing item. */
  href: string;
}

/** Subset of the profile fields used by the scholarship-readiness card. */
export type ScholarshipReadinessProfile = CompletionProfile & {
  skill_count?: number;
};

/**
 * Simple completion score shown on the profile card (mockup "Profile Score").
 *
 * Adding new categories is intentionally additive: existing callers that
 * pass a `CompletionProfile` without the new fields still get a valid
 * score (the missing fields are treated as "not done"). The Scholarship
 * Hub calls the more detailed {@link profileCompletionChecks} to render
 * a checklist.
 */
export function profileCompletion(profile: CompletionProfile, skillCount: number): number {
  return Math.round((profileCompletionChecks(profile, skillCount).filter((c) => c.done).length /
    profileCompletionChecks(profile, skillCount).length) * 100);
}

/**
 * One entry per completion category — used by the Scholarship Hub
 * "Get more matches" checklist and the home Profile Completion card.
 */
export function profileCompletionChecks(
  profile: CompletionProfile,
  skillCount: number,
): ProfileCompletionCheck[] {
  return [
    { id: 'name', label: 'Full name', done: Boolean(profile.full_name?.trim()), href: '/(tabs)/profile/edit' },
    { id: 'bio', label: 'Bio', done: Boolean(profile.bio?.trim()), href: '/(tabs)/profile/edit' },
    {
      id: 'university',
      label: 'University',
      done: Boolean(profile.university_id),
      href: '/(tabs)/profile/edit',
    },
    {
      id: 'department',
      label: 'Department',
      done: Boolean(profile.department_id),
      href: '/(tabs)/profile/edit',
    },
    {
      id: 'academic_level',
      label: 'Academic level',
      done: Boolean(profile.academic_level),
      href: '/(tabs)/profile/edit',
    },
    { id: 'phone', label: 'Phone', done: Boolean(profile.phone?.trim()), href: '/(tabs)/profile/edit' },
    {
      id: 'interests',
      label: 'Interests',
      done: profile.interests.length > 0,
      href: '/(tabs)/profile/edit',
    },
    { id: 'skills', label: 'At least one skill', done: skillCount > 0, href: '/(tabs)/profile/edit' },
    { id: 'cgpa', label: 'Latest CGPA / result', done: Boolean(profile.has_cgpa), href: '/(tabs)/portfolio' },
    {
      id: 'projects',
      label: 'A portfolio project',
      done: Boolean(profile.has_project),
      href: '/(tabs)/portfolio',
    },
    {
      id: 'publications',
      label: 'A research / publication',
      done: Boolean(profile.has_publication),
      href: '/(tabs)/portfolio',
    },
    {
      id: 'test_scores',
      label: 'A test score (IELTS / TOEFL / …)',
      done: Boolean(profile.has_test_score),
      href: '/(tabs)/profile/edit',
    },
    {
      id: 'activities',
      label: 'An activity or leadership role',
      done: Boolean(profile.has_activity),
      href: '/(tabs)/profile/edit',
    },
    {
      id: 'primary_resume',
      label: 'A primary CV / resume',
      done: Boolean(profile.has_primary_resume),
      href: '/(tabs)/portfolio',
    },
  ];
}

