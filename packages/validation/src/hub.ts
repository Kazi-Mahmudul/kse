import { z } from 'zod';
import {
  BOOK_CONDITIONS,
  BOOK_INTENTS,
  HUB_LISTING_STATUSES,
  HUB_REPORT_REASONS,
  HUB_SERVICE_TYPES,
  RESEARCH_COLLABORATION_TYPES,
} from '@kse/types';

import { uuidField } from './common';

/**
 * Student Hub form validation (spec student-hub).
 *
 * Shared between the mobile forms (react-hook-form + zodResolver) and the
 * admin panel (uncontrolled HTML inputs + useActionState) — same split as
 * the To-Let schemas in ./tolet.ts.
 */

const PHONE_PATTERN = /^[+0-9 ()\-]{6,20}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const URL_RE = /^https?:\/\/\S+$/i;

// ── Directory listing (mobile suggestion form) ───────────────────────────────

export const hubListingFormSchema = z.object({
  category_id: uuidField('Choose a category'),
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(120, 'Keep the name under 120 characters'),
  service_type: z.enum(HUB_SERVICE_TYPES, { message: 'Choose a service type' }),
  summary: z.string().trim().max(300).optional(),
  description: z.string().trim().max(3000).optional(),
  address: z.string().trim().max(200).optional(),
  area: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2, 'Enter a city').max(80),
  phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number').optional(),
  whatsapp: z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number').optional(),
  opening_hours: z.string().trim().max(120).optional(),
  price_note: z.string().trim().max(120).optional(),
  price_type: z.enum(['fixed', 'starting_from', 'approximate']).optional(),
  services: z.array(z.string().trim().min(1).max(60)).max(12, 'Up to 12 services').optional(),
  image_urls: z
    .array(z.string().regex(URL_RE, 'Image must be a valid URL'))
    .max(6, 'Up to 6 photos')
    .optional(),
});

export type HubListingFormValues = z.infer<typeof hubListingFormSchema>;

export const hubSubmissionPayloadSchema = hubListingFormSchema;
export type HubSubmissionPayload = HubListingFormValues;

// ── Book Exchange form ───────────────────────────────────────────────────────

export const bookListingFormSchema = z
  .object({
    title: z.string().trim().min(2, 'Book title is required').max(200),
    author: z.string().trim().max(150).optional(),
    subject: z.string().trim().max(100).optional(),
    edition: z.string().trim().max(40).optional(),
    condition: z.enum(BOOK_CONDITIONS, { message: 'Choose a condition' }),
    intent: z.enum(BOOK_INTENTS, { message: 'Choose exchange, sell or give away' }),
    /** Asking price in TAKA as entered by the student (converted to paisa). */
    price_taka: z
      .number({ message: 'Enter a numeric price' })
      .int('Whole numbers only')
      .positive('Price must be greater than zero')
      .max(100_000, 'Price looks too high')
      .nullable()
      .optional(),
    expected_exchange: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    image_urls: z.array(z.string().regex(URL_RE)).max(4, 'Up to 4 photos').optional(),
    contact_preference: z.enum(['in_app', 'phone']),
    phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number').optional(),
  })
  .superRefine((values, ctx) => {
    if (values.intent === 'sell' && (values.price_taka == null || values.price_taka <= 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['price_taka'],
        message: 'Set a price when selling',
      });
    }
    if (values.contact_preference === 'phone' && !values.phone) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Add a phone number to be contacted by phone',
      });
    }
  });

export type BookListingFormValues = z.infer<typeof bookListingFormSchema>;

// ── Research partner profile form ────────────────────────────────────────────

export const researchProfileFormSchema = z.object({
  research_interest: z
    .string()
    .trim()
    .min(3, 'What do you want to research?')
    .max(120),
  discipline: z.string().trim().max(120).optional(),
  topic: z.string().trim().max(200).optional(),
  skills: z
    .array(z.string().trim().min(1).max(40))
    .min(1, 'Add at least one skill')
    .max(12, 'Up to 12 skills'),
  collaboration_type: z.enum(RESEARCH_COLLABORATION_TYPES),
  institution: z.string().trim().max(150).optional(),
  district: z.string().trim().max(60).optional(),
  availability: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(1000).optional(),
});

export type ResearchProfileFormValues = z.infer<typeof researchProfileFormSchema>;

export const researchRequestSchema = z.object({
  to_profile_id: uuidField(),
  message: z
    .string()
    .trim()
    .min(10, 'Write a short message (10+ characters)')
    .max(1000),
});

export type ResearchRequestInput = z.infer<typeof researchRequestSchema>;

// ── Reports (spec student-hub §23) — reason list lives in @kse/types ────────

export const hubReportSchema = z.object({
  target_id: uuidField(),
  reason: z.enum(HUB_REPORT_REASONS),
  details: z.string().trim().max(500).nullable().optional(),
});

export type HubReportInput = z.infer<typeof hubReportSchema>;

// ── Admin form helpers (HTML form field → typed value) ───────────────────────

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : (value ?? null);

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

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

const servicesField = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
    }
    if (typeof value === 'string' && value.length > 0) {
      return value
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  },
  z.array(z.string().trim().min(1).max(60)).max(12),
);

const timeField = z.preprocess(
  emptyToNull,
  z.string().regex(TIME_RE, 'Use HH:MM (24h)').nullable(),
);

const imageUrlsField = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
    }
    if (typeof value === 'string' && value.length > 0) {
      return value
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  },
  z.array(z.string().regex(URL_RE)).max(8),
);

export const hubAdminFormSchema = z.object({
  category_id: uuidField('Choose a category'),
  name: z.string().trim().min(3).max(120),
  service_type: z.enum(HUB_SERVICE_TYPES, { message: 'Choose a service type' }),
  summary: optionalText(300),
  description: optionalText(3000),
  status: z.enum(HUB_LISTING_STATUSES),
  address: optionalText(200),
  area: optionalText(80),
  city: z.string().trim().min(2).max(80),
  district: optionalText(60),
  latitude: numericField({ min: -90, max: 90 }),
  longitude: numericField({ min: -180, max: 180 }),
  phone: z.preprocess(
    emptyToNull,
    z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number').nullable(),
  ),
  whatsapp: z.preprocess(
    emptyToNull,
    z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number').nullable(),
  ),
  email: z.preprocess(
    emptyToNull,
    z.string().trim().email('Enter a valid email').nullable().or(z.literal('')).nullable(),
  ),
  opening_hours: optionalText(120),
  opens_at: timeField,
  closes_at: timeField,
  price_note: optionalText(120),
  price_type: z.preprocess(
    emptyToNull,
    z.enum(['fixed', 'starting_from', 'approximate']).nullable(),
  ),
  services: servicesField,
  image_url: optionalText(500),
  image_urls: imageUrlsField,
  verified: booleanField,
});

export type HubAdminFormValues = z.infer<typeof hubAdminFormSchema>;

export const hubCategoryFormSchema = z.object({
  id: z.preprocess(emptyToNull, uuidField().nullable()),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, digits and dashes only'),
  name: z.string().trim().min(2).max(80),
  description: optionalText(200),
  icon: z.string().trim().min(3).max(60).default('grid-outline'),
  features: z.preprocess(
    (value) => {
      const kept = Array.isArray(value)
        ? value.filter((v): v is string => typeof v === 'string')
        : typeof value === 'string'
          ? value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
          : [];
      return kept.filter((f) => f === 'book_exchange' || f === 'research_partners');
    },
    z.array(z.enum(['book_exchange', 'research_partners'])).max(2),
  ),
  sort_order: numericField({ int: true, min: 0, max: 999 }),
  is_active: booleanField,
});

export type HubCategoryFormValues = z.infer<typeof hubCategoryFormSchema>;

export const hubOfferFormSchema = z
  .object({
    listing_id: uuidField(),
    title: z.string().trim().min(3).max(120),
    discount_kind: z.enum(['percent', 'amount', 'other']),
    /** percent: 1–100 · amount: TAKA as entered (converted to paisa). */
    discount_value: numericField({ min: 0, max: 1_000_000, int: true }),
    applies_to: optionalText(200),
    student_id_required: booleanField,
    valid_from: z.preprocess(emptyToNull, z.string().regex(ISO_DATE, 'Use YYYY-MM-DD').nullable()),
    valid_until: z.preprocess(emptyToNull, z.string().regex(ISO_DATE, 'Use YYYY-MM-DD').nullable()),
    terms: optionalText(300),
    is_active: booleanField,
  })
  .superRefine((values, ctx) => {
    if (values.discount_kind === 'percent') {
      if (values.discount_value == null || values.discount_value < 1 || values.discount_value > 100) {
        ctx.addIssue({
          code: 'custom',
          path: ['discount_value'],
          message: 'Percent offers must be between 1 and 100',
        });
      }
    }
    if (values.discount_kind === 'amount' && values.discount_value == null) {
      ctx.addIssue({ code: 'custom', path: ['discount_value'], message: 'Enter the offer amount' });
    }
    if (
      values.valid_from != null &&
      values.valid_until != null &&
      values.valid_from > values.valid_until
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['valid_until'],
        message: 'End date must be after the start date',
      });
    }
  });

export type HubOfferFormValues = z.infer<typeof hubOfferFormSchema>;
