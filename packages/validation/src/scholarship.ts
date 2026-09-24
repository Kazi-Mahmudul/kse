import { z } from 'zod';

import {
  DEGREE_LEVELS,
  SCHOLARSHIP_APPLICATION_STATUSES,
  TEST_SCORE_TYPES,
  USER_ACTIVITY_TYPES,
} from '@kse/types';

import { uuidField } from './common';

// ── user_test_scores ────────────────────────────────────────────────────────

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const optionalDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Use YYYY-MM-DD')
    .nullable(),
);

export const userTestScoreSchema = z.object({
  test_type: z.enum(TEST_SCORE_TYPES, { message: 'Choose a test' }),
  score: z.string().trim().min(1, 'Score is required').max(40),
  test_date: optionalDate,
  expires_on: optionalDate,
});

export type UserTestScoreInput = z.infer<typeof userTestScoreSchema>;

// ── user_activities ─────────────────────────────────────────────────────────

const optionalShortText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max).nullable(),
  );

export const userActivitySchema = z.object({
  activity_type: z.enum(USER_ACTIVITY_TYPES, { message: 'Choose a type' }),
  title: z.string().trim().min(2, 'Title is required').max(160),
  organization: optionalShortText(160),
  role: optionalShortText(120),
  start_date: optionalDate,
  end_date: optionalDate,
  is_ongoing: z.boolean(),
  description: optionalShortText(2000),
});

export type UserActivityInput = z.infer<typeof userActivitySchema>;

// ── scholarship_applications ────────────────────────────────────────────────

export const scholarshipApplicationSchema = z.object({
  opportunity_id: uuidField('Invalid scholarship id'),
  status: z.enum(SCHOLARSHIP_APPLICATION_STATUSES),
  notes: optionalShortText(2000),
  submitted_at: optionalDate,
});

export type ScholarshipApplicationInput = z.infer<
  typeof scholarshipApplicationSchema
>;

// ── opportunity_eligibility (admin form) ────────────────────────────────────

/**
 * Empty string → null so a cleared numeric input doesn't fail coercion. The
 * caller still has to deal with `null` when persisting; Postgres treats
 * `null` as "no constraint", which is the intended semantics.
 */
const optionalNumber = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === '' || value == null) return null;
      const n = typeof value === 'string' ? Number(value) : value;
      return Number.isFinite(n) ? n : value;
    },
    z.number({ message: 'Enter a number' }).max(max).nullable(),
  );

const optionalStringList = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim() !== '');
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [];
  },
  z.array(z.string().trim().min(1).max(160)).max(40),
);

const csvToStringArray = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim() !== '');
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [];
  },
  z.array(z.string().trim().min(1).max(80)).max(40),
);

export const opportunityEligibilitySchema = z.object({
  min_cgpa: optionalNumber(10),
  cgpa_scale: optionalNumber(10),
  degree_levels: optionalStringList,
  fields: csvToStringArray,
  countries: csvToStringArray,
  nationalities: csvToStringArray,
  ielts_min: optionalNumber(9),
  toefl_min: optionalNumber(120),
  pte_min: optionalNumber(90),
  gre_min: optionalNumber(340),
  requires_research: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()),
  requires_publication: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()),
  requires_work_experience: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()),
  requires_project_experience: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()),
  requires_leadership: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()),
  requires_extracurricular: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()),
  requires_test_score: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()),
  required_documents: csvToStringArray,
  other_requirements: optionalShortText(2000),
});

export type OpportunityEligibilityInput = z.infer<typeof opportunityEligibilitySchema>;
