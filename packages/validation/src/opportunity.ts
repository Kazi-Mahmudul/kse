import { z } from 'zod';
import {
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
  category_id: z.string().uuid().nullable().optional(),
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
  category_id: z.preprocess(
    emptyToNull,
    z.string().uuid('Choose a valid category').nullable(),
  ),
  status: z.enum(OPPORTUNITY_STATUSES, { message: 'Choose a status' }),
  featured: booleanField,
  verified: booleanField,
  source_name: optionalText(150),
  source_url: optionalUrl(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10, 'Up to 10 tags'),
});

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;
