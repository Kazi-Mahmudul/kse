import { z } from 'zod';

/**
 * Community post payload (spec §6 "Community"). DB CHECK enforces
 * 1..2000 chars; the form schema mirrors that with explicit messages.
 */
export const communityPostSchema = z.object({
  community_id: z.string().uuid(),
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
