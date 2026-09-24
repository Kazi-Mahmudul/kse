import { z } from 'zod';

export const academicLevelSchema = z.enum([
  'undergraduate',
  'postgraduate',
  'hsc',
  'ssc',
  'other',
]);

/**
 * Validates a UUID or `null`. An unset picker never forwards a blank
 * string to Postgres — that would otherwise fail with
 * `invalid input syntax for type uuid` on the FK columns — and any
 * stale malformed value gets rejected with a clear message instead of
 * silently corrupting state. `formToUpdatePayload` and `edit.tsx`'s
 * `defaultValues` guarantee `undefined` / empty strings are coerced
 * to `null` before they reach the schema.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const nullableUuid = z
  .union([z.string().regex(UUID_RE, 'Invalid selection'), z.null()])
  .nullable();

/** Student-editable profile fields only — roles/status are server-managed. */
export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  university_id: nullableUuid.optional(),
  department_id: nullableUuid.optional(),
  academic_level: academicLevelSchema.nullable().optional(),
  interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, 'Enter a valid phone number')
    .nullable()
    .optional(),
  // `avatar_url` is written by `uploadAvatar` after a successful Storage
  // upload; the form schema doesn't expose it, but the mutation reuses this
  // typed payload.
  avatar_url: z.string().url().nullable().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Edit-form facing schema: every field present (empty string = "not set"),
 * so forms render full state and submit a complete profile payload.
 *
 * Note: university/department/academic level used to live here but moved
 * to the Portfolio → Education section (a richer surface that handles
 * Khulna-district institutions, board, study group, etc.). The DB still
 * holds those columns on `profiles` for legacy data; they're not edited
 * from this form so they're omitted from the payload entirely. The
 * partial-update API call leaves them untouched.
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
  interests: z.array(z.string().trim().min(1).max(50)).max(20),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** Maps form values to the API update payload (empty strings become null).
 *  University / department / academic level are intentionally omitted —
 *  the form doesn't edit them, so they stay at whatever the user set
 *  elsewhere (Portfolio → Education). */
export function formToUpdatePayload(
  values: ProfileFormValues,
): Omit<ProfileUpdateInput, 'full_name' | 'interests' | 'university_id' | 'department_id' | 'academic_level'> & {
  full_name: string;
  interests: string[];
} {
  return {
    full_name: values.full_name,
    bio: values.bio.trim() === '' ? null : values.bio,
    phone: !values.phone || values.phone.trim() === '' ? null : values.phone.trim(),
    interests: values.interests,
  };
}
