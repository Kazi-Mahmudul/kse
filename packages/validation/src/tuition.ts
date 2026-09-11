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

/**
 * Become-a-tutor application (spec §6/§7): a student submits their teaching
 * profile; staff review it in the admin portal. Subject ids come from the
 * reference table, never free text.
 */
export const tutorApplicationSchema = z
  .object({
    headline: z.string().trim().min(10, 'Summarise your teaching in 10+ characters').max(120),
    bio: z.string().trim().max(2000).optional(),
    university_id: z.string().uuid().nullable().optional(),
    subject_ids: z
      .array(z.string().uuid())
      .min(1, 'Pick at least one subject')
      .max(8, 'Pick at most 8 subjects'),
    location: z.string().trim().max(120).optional(),
    expected_fee_min: z
      .number()
      .int('Whole numbers only')
      .min(0)
      .max(1_000_000)
      .nullable()
      .optional(),
    expected_fee_max: z
      .number()
      .int('Whole numbers only')
      .min(0)
      .max(1_000_000)
      .nullable()
      .optional(),
    availability: z.string().trim().max(120).optional(),
  })
  .refine(
    (value) =>
      value.expected_fee_min == null ||
      value.expected_fee_max == null ||
      value.expected_fee_min <= value.expected_fee_max,
    { message: 'Minimum fee must not exceed the maximum', path: ['expected_fee_min'] },
  );

export type TutorApplicationInput = z.infer<typeof tutorApplicationSchema>;

/** Free-text fields of the application form; ids validated by tutorApplicationSchema. */
export const tutorApplicationFormSchema = z.object({
  headline: z.string().trim().min(10, 'Summarise your teaching in 10+ characters').max(120),
  bio: z.string().trim().max(2000),
  location: z.string().trim().max(120),
  availability: z.string().trim().max(120),
  expected_fee_min: z.string().trim().optional(),
  expected_fee_max: z.string().trim().optional(),
});

export type TutorApplicationFormValues = z.infer<typeof tutorApplicationFormSchema>;

/** Review payload: 1–5 stars, optional comment (CLAUDE.md §6 tutor rating). */
export const tutorReviewSchema = z.object({
  rating: z
    .number()
    .int('Whole stars only')
    .min(1, 'Pick a star rating')
    .max(5),
  comment: z.string().trim().min(3, 'Reviews need at least 3 characters').max(1000).optional(),
});

export type TutorReviewInput = z.infer<typeof tutorReviewSchema>;
