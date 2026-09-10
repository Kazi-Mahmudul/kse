import { z } from 'zod';
import {
  DEGREE_LEVELS,
  FUNDING_TYPES,
  OPPORTUNITY_INTERNSHIP_TYPES,
  OPPORTUNITY_MODES,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
} from '@kse/types';

const isoDateString = z
  .string()
  .datetime({ offset: true, message: 'Enter a valid date/time' });

/** Admin-side opportunity create/update payload (CLAUDE.md §7, §8). */
export const opportunityCreateSchema = z.object({
  type: z.enum(OPPORTUNITY_TYPES),
  title: z.string().trim().min(3, 'Title is required').max(200),
  organization_name: z.string().trim().min(2, 'Organization is required').max(150),
  summary: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  location: z.string().trim().max(150).nullable().optional(),
  opportunity_mode: z.enum(OPPORTUNITY_MODES).nullable().optional(),
  eligibility: z.string().trim().max(2000).nullable().optional(),
  application_url: z.string().url('Enter a valid application URL').nullable().optional(),
  deadline: isoDateString.nullable().optional(),
  degree_level: z.enum(DEGREE_LEVELS).nullable().optional(),
  funding_type: z.enum(FUNDING_TYPES).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  // Internship-only fields (spec 06._internship_hub_kse).
  stipend_amount: z.number().nonnegative().finite().nullable().optional(),
  stipend_currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO currency code (e.g. BDT, USD)')
    .nullable()
    .optional(),
  internship_type: z.enum(OPPORTUNITY_INTERNSHIP_TYPES).nullable().optional(),
  featured: z.boolean().optional(),
  verified: z.boolean().optional(),
  source_name: z.string().trim().max(150).nullable().optional(),
  source_url: z.string().url().nullable().optional(),
});

export const opportunityUpdateSchema = opportunityCreateSchema.partial().extend({
  status: z
    .enum(['draft', 'pending_review', 'published', 'rejected', 'expired', 'archived'])
    .optional(),
});

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;

// ── Mobile filter schema (spec 06._internship_hub_kse) ──────────────────────
// Used by the mobile filter bar / URL params. All fields optional so empty
// filters parse cleanly.

export const opportunityFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(OPPORTUNITY_TYPES).optional(),
  mode: z.enum(OPPORTUNITY_MODES).optional(),
  categoryId: z.string().uuid().optional(),
  degreeLevel: z.enum(DEGREE_LEVELS).optional(),
  fundingType: z.enum(FUNDING_TYPES).optional(),
  location: z.string().trim().max(150).optional(),
  organization: z.string().trim().max(150).optional(),
  /** Internship-only chip filter (spec 06._internship_hub_kse). */
  internshipType: z.enum(OPPORTUNITY_INTERNSHIP_TYPES).optional(),
  deadlineWithinDays: z.number().int().positive().max(365).nullable().optional(),
});

export type OpportunityFiltersInput = z.infer<typeof opportunityFiltersSchema>;

// ── Admin form schema ────────────────────────────────────────────────────────
// HTML form fields arrive as flat strings ('' for empty). These helpers
// normalize them to the nullable shapes the create/update schemas expect.

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const optionalText = (max: number, message?: string) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max, message ?? `Must be ${max} characters or fewer`).nullable(),
  );

const optionalUrl = (message = 'Enter a valid URL') =>
  z.preprocess(emptyToNull, z.string().url(message).nullable());

/** datetime-local value ("2026-09-15T17:00") → UTC ISO timestamp. */
const deadlineField = z.preprocess(
  (value) => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const withSeconds = value.length === 16 ? `${value}:00` : value;
    return `${withSeconds}Z`;
  },
  z.string().datetime({ offset: true, message: 'Enter a valid date/time' }).nullable(),
);

const booleanField = z.preprocess(
  (value) => value === true || value === 'on' || value === 'true',
  z.boolean(),
);

/** Admin opportunity editor form (create + edit share this shape). */
export const opportunityFormSchema = z.object({
  type: z.enum(OPPORTUNITY_TYPES, { message: 'Choose a type' }),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  organization_name: z
    .string()
    .trim()
    .min(2, 'Organization is required')
    .max(150),
  summary: optionalText(300),
  description: optionalText(10_000),
  image_url: optionalUrl(),
  location: optionalText(150),
  opportunity_mode: z.preprocess(
    emptyToNull,
    z.enum(OPPORTUNITY_MODES, { message: 'Invalid mode' }).nullable(),
  ),
  eligibility: optionalText(2000),
  application_url: optionalUrl('Enter a valid application URL'),
  deadline: deadlineField,
  degree_level: z.preprocess(
    emptyToNull,
    z.enum(DEGREE_LEVELS, { message: 'Invalid degree level' }).nullable(),
  ),
  funding_type: z.preprocess(
    emptyToNull,
    z.enum(FUNDING_TYPES, { message: 'Invalid funding type' }).nullable(),
  ),
  country: optionalText(100),
  category_id: z.preprocess(
    emptyToNull,
    z.string().uuid('Choose a valid category').nullable(),
  ),
  // Internship-only fields (spec 06._internship_hub_kse).
  stipend_amount: z.preprocess(
    emptyToNull,
    z
      .number({ message: 'Enter a number' })
      .nonnegative('Stipend cannot be negative')
      .finite()
      .nullable(),
  ),
  stipend_currency: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .regex(
        /^[A-Z]{3}$/,
        'Use a 3-letter ISO currency code (e.g. BDT, USD)',
      )
      .nullable(),
  ),
  internship_type: z.preprocess(
    emptyToNull,
    z.enum(OPPORTUNITY_INTERNSHIP_TYPES, { message: 'Invalid internship type' }).nullable(),
  ),
  status: z.enum(OPPORTUNITY_STATUSES, { message: 'Choose a status' }),
  featured: booleanField,
  verified: booleanField,
  source_name: optionalText(150),
  source_url: optionalUrl(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10, 'Up to 10 tags'),
});

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;
