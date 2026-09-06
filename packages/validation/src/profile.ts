import { z } from 'zod';

export const academicLevelSchema = z.enum([
  'undergraduate',
  'postgraduate',
  'hsc',
  'ssc',
  'other',
]);

/** Student-editable profile fields only — roles/status are server-managed. */
export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  university_id: z.string().uuid().nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
  academic_level: academicLevelSchema.nullable().optional(),
  interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, 'Enter a valid phone number')
    .nullable()
    .optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Edit-form facing schema: every field present (empty string = "not set"),
 * so forms render full state and submit a complete profile payload.
 */
export const profileFormSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required').max(100),
  bio: z.string().trim().max(500, 'Bio must be 500 characters or fewer'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, 'Enter a valid phone number')
    .or(z.literal(''))
    .or(z.null()),
  university_id: z.string().uuid().nullable(),
  department_id: z.string().uuid().nullable(),
  academic_level: academicLevelSchema.nullable(),
  interests: z.array(z.string().trim().min(1).max(50)).max(20),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** Maps form values to the API update payload (empty strings become null). */
export function formToUpdatePayload(
  values: ProfileFormValues,
): Omit<ProfileUpdateInput, 'full_name' | 'interests'> & {
  full_name: string;
  interests: string[];
} {
  return {
    full_name: values.full_name,
    bio: values.bio.trim() === '' ? null : values.bio,
    phone: !values.phone || values.phone.trim() === '' ? null : values.phone.trim(),
    university_id: values.university_id,
    department_id: values.department_id,
    academic_level: values.academic_level,
    interests: values.interests,
  };
}
