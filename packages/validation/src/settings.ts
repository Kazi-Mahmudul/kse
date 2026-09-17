import { z } from 'zod';

/**
 * Platform settings form (CLAUDE.md §7 "Platform Settings"). Values persist
 * to the app_settings key-value table as jsonb blobs (one row per key).
 */

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : (value ?? null);

const optionalUrl = z.preprocess(
  emptyToNull,
  z.string().url('Enter a valid URL').nullable(),
);

const booleanField = z.preprocess(
  (value) => value === true || value === 'on' || value === 'true',
  z.boolean(),
);

/** Feature flags arrive as a JSON string from a textarea. */
const featureFlagsField = z.preprocess(
  (value) => {
    if (typeof value !== 'string' || value.trim() === '') return {};
    try {
      return JSON.parse(value);
    } catch {
      return value; // let z.record reject the invalid JSON text
    }
  },
  z.record(z.string(), z.boolean()),
);

export const settingsFormSchema = z.object({
  maintenance_mode: booleanField,
  support_contact: z
    .string()
    .trim()
    .min(3, 'Support contact is required')
    .max(150),
  terms_url: optionalUrl,
  privacy_url: optionalUrl,
  min_app_version: z
    .string()
    .trim()
    .regex(/^\d+\.\d+\.\d+$/, 'Use a version like 1.0.0'),
  facebook_url: optionalUrl,
  instagram_url: optionalUrl,
  linkedin_url: optionalUrl,
  website_url: optionalUrl,
  feature_flags: featureFlagsField,
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
