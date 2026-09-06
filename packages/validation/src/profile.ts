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
