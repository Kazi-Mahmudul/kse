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
 * The form surface never lets the user type into the UUID fields — they
 * only round-trip through the pickers — but `edit.tsx` must still coerce
 * `undefined` defaults (from a fresh RHF mount) to `null` before they
 * reach the resolver. The resolver itself rejects a malformed UUID with
 * the message "Invalid selection" so it reads more clearly than Zod's
 * stock "Invalid uuid" string surfaced back from Postgres.
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
  university_id: nullableUuid,
  department_id: nullableUuid,
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
    university_id: values.university_id ?? null,
    department_id: values.department_id ?? null,
    academic_level: values.academic_level ?? null,
    interests: values.interests,
  };
}
