/**
 * Scholarship system types. Built on top of the unified `opportunities`
 * table (scholarships are `type='scholarship'` rows), with three side
 * tables for eligibility rules and student signals.
 */

import type { DegreeLevel } from './opportunity';

export const TEST_SCORE_TYPES = [
  'ielts',
  'toefl',
  'pte',
  'gre',
  'duolingo',
  'oet',
  'toeic',
  'met',
  'moi',
  'other',
] as const;
export type TestScoreType = (typeof TEST_SCORE_TYPES)[number];

export const TEST_SCORE_LABELS: Record<TestScoreType, string> = {
  ielts: 'IELTS',
  toefl: 'TOEFL',
  pte: 'PTE',
  gre: 'GRE',
  duolingo: 'Duolingo English Test',
  oet: 'OET',
  toeic: 'TOEIC',
  met: 'MET (Michigan)',
  moi: 'Medium of Instruction (MOI)',
  other: 'Other',
};

export const USER_ACTIVITY_TYPES = [
  'volunteering',
  'leadership',
  'debate',
  'sports',
  'cultural',
  'social_work',
  'club',
  'competition',
  'other',
] as const;
export type UserActivityType = (typeof USER_ACTIVITY_TYPES)[number];

export const USER_ACTIVITY_LABELS: Record<UserActivityType, string> = {
  volunteering: 'Volunteering',
  leadership: 'Leadership',
  debate: 'Debate / Public Speaking',
  sports: 'Sports',
  cultural: 'Cultural Activity',
  social_work: 'Social Work',
  club: 'Club / Society',
  competition: 'Competition',
  other: 'Other',
};

export const SCHOLARSHIP_APPLICATION_STATUSES = [
  'saved',
  'interested',
  'preparing',
  'applied',
  'rejected',
  'selected',
] as const;
export type ScholarshipApplicationStatus =
  (typeof SCHOLARSHIP_APPLICATION_STATUSES)[number];

export const SCHOLARSHIP_APPLICATION_STATUS_LABELS: Record<
  ScholarshipApplicationStatus,
  string
> = {
  saved: 'Saved',
  interested: 'Interested',
  preparing: 'Preparing',
  applied: 'Applied',
  rejected: 'Rejected',
  selected: 'Selected',
};

/** Match-engine output levels, ordered best→worst. */
export const SCHOLARSHIP_MATCH_LEVELS = [
  'highly_matched',
  'eligible',
  'potential',
  'not_eligible',
] as const;
export type ScholarshipMatchLevel = (typeof SCHOLARSHIP_MATCH_LEVELS)[number];

export const SCHOLARSHIP_MATCH_LEVEL_LABELS: Record<ScholarshipMatchLevel, string> = {
  highly_matched: 'Highly Matched',
  eligible: 'Eligible',
  potential: 'Potential',
  not_eligible: 'Not Eligible',
};

/**
 * One row of opportunity_eligibility. Drives the matching engine and the
 * admin form. Null cells mean "no constraint" (e.g. min_cgpa = null ⇒
 * no minimum), not "zero".
 */
export interface OpportunityEligibility {
  opportunity_id: string;
  min_cgpa: number | null;
  cgpa_scale: number | null;
  degree_levels: DegreeLevel[];
  fields: string[];
  countries: string[];
  nationalities: string[];
  ielts_min: number | null;
  toefl_min: number | null;
  pte_min: number | null;
  gre_min: number | null;
  requires_research: boolean;
  requires_publication: boolean;
  requires_work_experience: boolean;
  requires_project_experience: boolean;
  requires_leadership: boolean;
  requires_extracurricular: boolean;
  requires_test_score: boolean;
  required_documents: string[];
  other_requirements: string | null;
  created_at: string;
  updated_at: string;
}

/** One row of user_test_scores. */
export interface UserTestScore {
  id: string;
  user_id: string;
  test_type: TestScoreType;
  score: string;
  test_date: string | null;
  expires_on: string | null;
  created_at: string;
  updated_at: string;
}

/** One row of user_activities. */
export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: UserActivityType;
  title: string;
  organization: string | null;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_ongoing: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** One row of scholarship_applications. */
export interface ScholarshipApplication {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: ScholarshipApplicationStatus;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Result of the matching engine. `passed` lists human-readable reasons
 * the scholarship matches; `failed` lists missing requirements with the
 * student's current value (where meaningful) so the UI can show "you
 * need 3.5 CGPA, you have 3.2".
 */
export interface ScholarshipMatchReason {
  /** Short stable identifier for the rule (used by the UI for icons). */
  rule:
    | 'cgpa'
    | 'degree_level'
    | 'field'
    | 'country'
    | 'nationality'
    | 'ielts'
    | 'toefl'
    | 'pte'
    | 'gre'
    | 'duolingo'
    | 'oet'
    | 'toeic'
    | 'met'
    | 'moi'
    | 'test_score_present'
    | 'research'
    | 'publication'
    | 'work_experience'
    | 'project_experience'
    | 'leadership'
    | 'extracurricular';
  passed: boolean;
  message: string;
}

export interface ScholarshipMatch {
  opportunity_id: string;
  level: ScholarshipMatchLevel;
  reasons: ScholarshipMatchReason[];
}
