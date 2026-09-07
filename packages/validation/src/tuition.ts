import { z } from 'zod';

/**
 * Tuition requests (spec §6): a student either targets a specific tutor or
 * asks for a subject — the DB CHECK requires at least one of the two.
 * Tutor/subject ids come from route params, not free-text fields.
 */
export const tuitionRequestSchema = z
  .object({
    tutor_id: z.string().uuid().nullable().optional(),
    subject_id: z.string().uuid().nullable().optional(),
    message: z.string().trim().min(10).max(1000),
    preferred_time: z.string().trim().max(100).nullable().optional(),
  })
  .refine(
    (value) => Boolean(value.tutor_id || value.subject_id),
    { message: 'Choose a tutor or a subject' },
  );

export type TuitionRequestInput = z.infer<typeof tuitionRequestSchema>;

/** Free-text fields of the request form; ids are validated by tuitionRequestSchema. */
export const tuitionRequestFormSchema = z.object({
  message: z.string().trim().min(10, 'Write at least 10 characters').max(1000),
  preferred_time: z.string().trim().max(100),
});

export type TuitionRequestFormValues = z.infer<typeof tuitionRequestFormSchema>;
