import { z } from 'zod';
import {
  TOLET_GENDER_PREFERENCES,
  TOLET_LISTING_STATUSES,
  TOLET_ROOM_TYPES,
  type ToletRoomType,
} from '@kse/types';

import { uuidField } from './common';

/**
 * Bachelor To-Let form validation (spec bachelor-to-let).
 *
 * Shared between:
 *   - the mobile "Post a To-Let" form (react-hook-form + zodResolver)
 *   - the admin edit form (uncontrolled HTML inputs + `useActionState`)
 *
 * The two contexts differ in field typing — string vs File/Buffer — so the
 * shape below is what both surfaces produce after their respective
 * preprocessing step. The mobile form feeds this directly; the admin form
 * preprocesses FormData first (see `parseToletFormAction`).
 */

const PHONE_PATTERN = /^[+0-9 ()\-]{6,20}$/;
const WHATSAPP_PATTERN = /^\+?[0-9]{6,15}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\/\S+$/i;

export const toletListingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Keep the title under 150 characters'),
  summary: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  location: z
    .string()
    .trim()
    .min(3, 'Enter a location (e.g. address, landmark)')
    .max(200),
  city: z.string().trim().min(2, 'Enter a city').max(80),
  area: z.string().trim().max(80).nullable().optional(),
  room_type: z.enum(TOLET_ROOM_TYPES, { message: 'Choose a room type' }),
  gender_preference: z.enum(TOLET_GENDER_PREFERENCES),
  rent_amount: z
    .number({ message: 'Enter a numeric rent amount' })
    .positive('Rent must be greater than zero')
    .finite()
    .max(1_000_000, 'Rent looks too high; double-check'),
  rent_currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO currency code (BDT, USD, …)'),
  available_from: z
    .string()
    .regex(ISO_DATE, 'Use a YYYY-MM-DD date')
    .nullable()
    .optional(),
  bachelor_friendly: z.boolean().optional().default(true),
  utilities_included: z.boolean().optional().default(false),
  landlord_phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'Enter a valid phone number'),
  whatsapp: z
    .string()
    .trim()
    .regex(WHATSAPP_PATTERN, 'WhatsApp must be digits only (+country code ok)')
    .nullable()
    .optional(),
  contact_email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .nullable()
    .optional(),
  total_rooms: z
    .number({ message: 'Total rooms' })
    .int('Whole numbers only')
    .positive('Total rooms must be at least 1')
    .max(200, 'More than 200 rooms? Please double-check')
    .nullable()
    .optional(),
  available_rooms: z
    .number({ message: 'Available rooms' })
    .int('Whole numbers only')
    .nonnegative('Available rooms cannot be negative')
    .max(200)
    .nullable()
    .optional(),
  floor: z
    .number({ message: 'Floor' })
    .int('Whole numbers only')
    .min(-2, 'Basement deeper than 2?')
    .max(100, 'More than 100 floors?')
    .nullable()
    .optional(),
  image_urls: z
    .array(z.string().regex(URL_RE, 'Image must be a valid URL'))
    .min(1, 'Add at least one photo')
    .max(8, 'Up to 8 photos'),
}).superRefine((values, ctx) => {
  if (
    values.available_rooms != null
    && values.total_rooms != null
    && values.available_rooms > values.total_rooms
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['available_rooms'],
      message: 'Available rooms cannot exceed total rooms',
    });
  }
});

export type ToletListingFormValues = z.infer<typeof toletListingFormSchema>;

// ── Mobile filter schema ────────────────────────────────────────────────────

export const toletFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
  roomType: z.enum(TOLET_ROOM_TYPES).optional(),
  gender: z.enum(TOLET_GENDER_PREFERENCES).optional(),
  bachelorFriendly: z.boolean().optional(),
  listingStatus: z.enum(TOLET_LISTING_STATUSES).optional(),
  minRent: z.number().nonnegative().finite().optional(),
  maxRent: z.number().nonnegative().finite().optional(),
  maxTotalRooms: z.number().int().positive().max(200).optional(),
  sort: z.enum(['recent', 'rent_asc', 'rent_desc']).optional(),
});

export type ToletFiltersInput = z.infer<typeof toletFiltersSchema>;

// ── Mobile submission payload (Edge Function payload, no UI transforms) ──────
//
// Re-exports the form shape as the shape the Edge Function accepts. Kept
// separate so future divergence (e.g. server-side auto-stamping owner info)
// doesn't break the form schema.

export const toletSubmissionPayloadSchema = toletListingFormSchema;
export type ToletSubmissionPayload = ToletListingFormValues;

// ── Admin form helpers (HTML form field → typed value) ──────────────────────

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : (value ?? null);

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max).nullable(),
  );

const booleanField = z.preprocess(
  (value) => value === true || value === 'on' || value === 'true',
  z.boolean(),
);

const numericField = (opts: { min?: number; max?: number; int?: boolean } = {}) =>
  z.preprocess(
    (value) => {
      const normalized = emptyToNull(value);
      if (normalized === null) return null;
      return typeof normalized === 'string' ? Number(normalized) : normalized;
    },
    z
      .number()
      .refine((n) => !Number.isNaN(n), { message: 'Enter a number' })
      .refine((n) => (opts.int ? Number.isInteger(n) : true), {
        message: 'Whole numbers only',
      })
      .refine((n) => (opts.min != null ? n >= opts.min : true), {
        message: `Must be at least ${opts.min}`,
      })
      .refine((n) => (opts.max != null ? n <= opts.max : true), {
        message: `Must be at most ${opts.max}`,
      })
      .nullable(),
  );

const imageUrlsField = z.preprocess(
  (value) => {
    // FormData exposes repeated keys as the same string value; multi-value
    // inputs use getAll('image_urls'). The action normalises both shapes.
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
    }
    if (typeof value === 'string' && value.length > 0) {
      // Allow comma-separated as a fallback for the textarea pattern.
      return value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  },
  z.array(z.string().regex(URL_RE)).max(8, 'Up to 8 photos'),
);

export const toletAdminFormSchema = z.object({
  // Common opportunity fields (admin can edit owner / status / source).
  organization_name: optionalText(120),
  image_url: optionalText(500),
  application_url: optionalText(500),
  status: z.enum([
    'draft',
    'pending_review',
    'published',
    'rejected',
    'archived',
    'expired',
  ]),
  verified: booleanField,
  source_name: optionalText(120),
  source_url: optionalText(500),

  title: z.string().trim().min(5).max(150),
  summary: optionalText(300),
  description: optionalText(3000),
  location: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  area: optionalText(80),
  room_type: z.preprocess(
    emptyToNull,
    z.enum(TOLET_ROOM_TYPES, { message: 'Choose a room type' }).nullable(),
  ),
  gender_preference: z.preprocess(
    emptyToNull,
    z.enum(TOLET_GENDER_PREFERENCES).nullable(),
  ),
  rent_amount: numericField({ min: 0.01, max: 1_000_000 }),
  rent_currency: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, '3-letter ISO code')
      .nullable(),
  ),
  available_from: z.preprocess(
    (value) => {
      const v = emptyToNull(value);
      if (v == null) return null;
      // Accept both 'YYYY-MM-DD' and datetime-local.
      const s = String(v);
      if (ISO_DATE.test(s)) return s;
      if (s.length >= 10) return s.slice(0, 10);
      return null;
    },
    z.string().regex(ISO_DATE, 'Use YYYY-MM-DD').nullable(),
  ),
  bachelor_friendly: booleanField,
  utilities_included: booleanField,
  landlord_phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'Enter a valid phone number'),
  whatsapp: optionalText(20),
  contact_email: optionalText(120),
  total_rooms: numericField({ int: true, min: 1, max: 200 }),
  available_rooms: numericField({ int: true, min: 0, max: 200 }),
  floor: numericField({ int: true, min: -2, max: 100 }),
  listing_status: z.preprocess(
    emptyToNull,
    z.enum(TOLET_LISTING_STATUSES).nullable(),
  ),
  image_urls: imageUrlsField,
});

export type ToletAdminFormValues = z.infer<typeof toletAdminFormSchema>;

// ── Report payload ──────────────────────────────────────────────────────────

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'inappropriate',
  'scam',
  'misleading',
  'other',
] as const;

export const toletReportSchema = z.object({
  listing_id: uuidField(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).nullable().optional(),
});

export type ToletReportInput = z.infer<typeof toletReportSchema>;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a room-type form value to the canonical DB enum (Pascal-case safe). */
export function normalizeToletRoomType(input: string | null | undefined): ToletRoomType | null {
  if (!input) return null;
  return (TOLET_ROOM_TYPES as readonly string[]).includes(input)
    ? (input as ToletRoomType)
    : null;
}
