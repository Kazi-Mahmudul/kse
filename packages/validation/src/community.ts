import { z } from 'zod';

import { uuidField } from './common';

/**
 * Community post payload (spec §6 "Community"). DB CHECK enforces
 * 1..2000 chars; the form schema mirrors that with explicit messages.
 */
export const communityPostSchema = z.object({
  community_id: uuidField(),
  content: z.string().trim().min(1, 'Write something to post').max(2000),
  is_announcement: z.boolean().default(false),
});

export type CommunityPostInput = z.infer<typeof communityPostSchema>;

/** Form-only schema: community_id supplied by route, announcement toggle optional. */
export const communityPostFormSchema = z.object({
  content: z.string().trim().min(1, 'Write something to post').max(2000),
  is_announcement: z.boolean(),
});

export type CommunityPostFormValues = z.infer<typeof communityPostFormSchema>;

// ── Admin community editor ──────────────────────────────────────────────────

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : (value ?? null);

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

/** Admin create-community form (communities.slug is unique; name required). */
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
  status: z.enum(['active', 'hidden', 'removed'], {
    message: 'Choose a status',
  }),
});

export type CommunityFormValues = z.infer<typeof communityFormSchema>;
