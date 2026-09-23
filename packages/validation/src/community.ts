import { z } from 'zod';

import { UUID_PATTERN, uuidField } from './common';

/**
 * Community system validation. Mirrors the DB CHECK constraints
 * (content 1..2000, comments 1..1500, poll options 1..120 …) with explicit
 * messages. Shared by the mobile app, the admin panel and the
 * community-actions Edge Function.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : (value ?? null);

const optionalUrl = z
  .string()
  .trim()
  .max(2000, 'URL must be 2000 characters or fewer')
  .url('Enter a valid URL (https://…)')
  .nullable()
  .optional();

/**
 * Form-friendly optional URL: RHF+zodResolver requires matching input/output
 * types, so form schemas avoid `z.preprocess` — empty string means "not set".
 */
const formOptionalUrl = z
  .string()
  .trim()
  .max(2000, 'URL must be 2000 characters or fewer')
  .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), {
    message: 'Enter a valid URL (https://…)',
  });

const formOptionalText = (max: number) => z.string().trim().max(max);

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug must be at least 3 characters')
  .max(80, 'Slug must be 80 characters or fewer')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, digits and single dashes',
  );

// ── Posts ────────────────────────────────────────────────────────────────────

export const COMMUNITY_POST_TYPE_VALUES = [
  'discussion',
  'question',
  'opportunity',
  'announcement',
  'poll',
] as const;

export const communityPostSchema = z.object({
  community_id: uuidField(),
  author_id: uuidField().optional(),
  post_type: z.enum(COMMUNITY_POST_TYPE_VALUES).default('discussion'),
  content: z.string().trim().min(1, 'Write something to post').max(2000),
  image_url: optionalUrl,
  link_url: optionalUrl,
});

export type CommunityPostInput = z.infer<typeof communityPostSchema>;

/** Form-only schema: community_id supplied by route, files uploaded separately. */
export const communityPostFormSchema = z.object({
  postType: z.enum(COMMUNITY_POST_TYPE_VALUES, { message: 'Choose a post type' }),
  content: z.string().trim().min(1, 'Write something to post').max(2000),
  linkUrl: formOptionalUrl,
});

export type CommunityPostFormValues = z.infer<typeof communityPostFormSchema>;

// ── Polls ────────────────────────────────────────────────────────────────────

export const POLL_RESULT_VISIBILITY_VALUES = [
  'realtime',
  'after_vote',
  'after_close',
] as const;

export const communityPollFormSchema = z
  .object({
    question: z.string().trim().min(5, 'Ask a clear question').max(300),
    options: z
      .array(z.string().trim().min(1, 'Option text is required').max(120))
      .min(2, 'A poll needs at least 2 options')
      .max(6, 'A poll can have at most 6 options'),
    closesAt: z.string().nullable(),
    resultVisibility: z.enum(POLL_RESULT_VISIBILITY_VALUES),
  })
  .refine(
    (values) => !values.closesAt || new Date(values.closesAt).getTime() > Date.now(),
    { path: ['closesAt'], message: 'Closing time must be in the future' },
  )
  .refine((values) => new Set(values.options.map((o) => o.toLowerCase())).size === values.options.length, {
    path: ['options'],
    message: 'Options must be unique',
  });

export type CommunityPollFormValues = z.infer<typeof communityPollFormSchema>;

// ── Comments ─────────────────────────────────────────────────────────────────

export const communityCommentSchema = z.object({
  post_id: uuidField(),
  parent_id: uuidField().nullable().optional(),
  content: z.string().trim().min(1, 'Write a comment').max(1500),
});

export type CommunityCommentInput = z.infer<typeof communityCommentSchema>;

export const communityCommentFormSchema = z.object({
  content: z.string().trim().min(1, 'Write a comment').max(1500),
});

export type CommunityCommentFormValues = z.infer<typeof communityCommentFormSchema>;

// ── Community creation requests ──────────────────────────────────────────────

export const communityRequestFormSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(80),
  categoryId: uuidField('Choose a category'),
  description: z
    .string()
    .trim()
    .min(10, 'Describe the community in at least 10 characters')
    .max(1000),
  purpose: z
    .string()
    .trim()
    .min(10, 'Explain the purpose in at least 10 characters')
    .max(500),
  universityId: z
    .string()
    .regex(UUID_PATTERN, 'Choose a valid university')
    .nullable(),
  departmentId: z
    .string()
    .regex(UUID_PATTERN, 'Choose a valid department')
    .nullable(),
  rules: z
    .array(z.string().trim().min(3, 'Rule text is too short').max(500))
    .max(8, 'Keep it to 8 rules or fewer'),
});

export type CommunityRequestFormValues = z.infer<typeof communityRequestFormSchema>;

/**
 * RHF-managed subset of the request form: category/university/department/rules
 * come from controlled SelectFields and local state, so only the text fields
 * go through the resolver.
 */
export const communityRequestTextFormSchema = communityRequestFormSchema.pick({
  name: true,
  description: true,
  purpose: true,
});

export type CommunityRequestTextFormValues = z.infer<typeof communityRequestTextFormSchema>;

/** Wire payload sent to the community-actions Edge Function. */
export const communityRequestInputSchema = z.object({
  name: z.string().trim().min(3).max(80),
  category_id: uuidField(),
  description: z.string().trim().min(10).max(1000),
  purpose: z.string().trim().min(10).max(500).nullable().optional(),
  university_id: uuidField().nullable().optional(),
  department_id: uuidField().nullable().optional(),
  proposed_rules: z.array(z.string().trim().min(3).max(500)).max(8).default([]),
  image_url: z.string().trim().url().nullable().optional(),
});

export type CommunityRequestInput = z.infer<typeof communityRequestInputSchema>;

// ── Events ───────────────────────────────────────────────────────────────────

export const COMMUNITY_EVENT_MODE_VALUES = ['online', 'offline', 'hybrid'] as const;

export const communityEventFormSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
    description: formOptionalText(2000),
    startsAt: z.string().min(1, 'Pick a start date and time'),
    endsAt: formOptionalText(50),
    mode: z.enum(COMMUNITY_EVENT_MODE_VALUES, { message: 'Choose the event mode' }),
    location: formOptionalText(200),
    meetingUrl: formOptionalUrl,
    organizer: formOptionalText(100),
  })
  .refine(
    (values) =>
      !values.endsAt || new Date(values.endsAt).getTime() > new Date(values.startsAt).getTime(),
    { path: ['endsAt'], message: 'End time must be after the start time' },
  )
  .refine(
    (values) => values.mode !== 'online' || values.meetingUrl,
    { path: ['meetingUrl'], message: 'Online events need a meeting link' },
  );

export type CommunityEventFormValues = z.infer<typeof communityEventFormSchema>;

// ── Reports ──────────────────────────────────────────────────────────────────

export const COMMUNITY_REPORT_REASON_VALUES = [
  'spam',
  'harassment',
  'inappropriate',
  'scam',
  'misleading',
  'other',
] as const;

export const communityReportFormSchema = z.object({
  reason: z.enum(COMMUNITY_REPORT_REASON_VALUES, { message: 'Choose a reason' }),
  details: z.string().trim().max(500, 'Keep details under 500 characters').optional(),
});

export type CommunityReportFormValues = z.infer<typeof communityReportFormSchema>;

// ── Admin community editor ───────────────────────────────────────────────────

export const communityFormSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
  slug: slugField,
  description: z.preprocess(
    emptyToNull,
    z.string().trim().max(2000, 'Description must be 2000 characters or fewer').nullable(),
  ),
  university_id: z.preprocess(
    emptyToNull,
    uuidField('Choose a valid university').nullable(),
  ),
  department_id: z.preprocess(
    emptyToNull,
    uuidField('Choose a valid department').nullable(),
  ),
  category_id: z.preprocess(
    emptyToNull,
    uuidField('Choose a valid category').nullable(),
  ),
  status: z.enum(['active', 'hidden', 'removed'], {
    message: 'Choose a status',
  }),
});

export type CommunityFormValues = z.infer<typeof communityFormSchema>;

export const communityCategoryFormSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(60),
  slug: slugField,
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export type CommunityCategoryFormValues = z.infer<typeof communityCategoryFormSchema>;
