import { z } from 'zod';
import { OPPORTUNITY_MODES, OPPORTUNITY_TYPES } from '@kse/types';

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
