import { z } from 'zod';
import {
  EDUCATION_INSTITUTION_OWNERSHIPS,
  EDUCATION_INSTITUTION_TYPES,
  OPPORTUNITY_TYPES,
} from '@kse/types';

import { uuidField } from './common';

/**
 * Master-data entity forms (CLAUDE.md §7 "Master Data"). Tables are
 * service-role-write only (RLS has no insert/update policies), so these
 * schemas guard the admin form payload before the privileged write.
 */

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : (value ?? null);

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max, `Must be ${max} characters or fewer`).nullable(),
  );

const nameField = (max: number) =>
  z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(max, `Must be ${max} characters or fewer`);

/** <input type="number"> submits a string — coerce before z.number(). */
const smallInt = z.preprocess(
  (value) => {
    const normalized = emptyToNull(value);
    if (normalized === null) return 0;
    return typeof normalized === 'string' ? Number(normalized) : normalized;
  },
  z
    .number({ message: 'Enter a number' })
    .int('Whole numbers only')
    .min(0, 'Cannot be negative')
    .max(999),
);

export const universityFormSchema = z.object({
  name: nameField(150),
  short_name: optionalText(30),
  location: optionalText(150),
});

export const departmentFormSchema = z.object({
  university_id: uuidField('Choose a university'),
  name: nameField(150),
  code: optionalText(20),
});

export const subjectFormSchema = z.object({
  name: nameField(100),
});

export const skillFormSchema = z.object({
  name: nameField(100),
});

export const opportunityCategoryFormSchema = z.object({
  name: nameField(100),
  opportunity_type: z.preprocess(
    emptyToNull,
    z.enum(OPPORTUNITY_TYPES, { message: 'Invalid type' }).nullable(),
  ),
  sort_order: smallInt,
});

export const tagFormSchema = z.object({
  name: nameField(50),
});

/** Row id for delete actions. */
export const idSchema = z.object({
  id: uuidField('Invalid id'),
});

// ── Education institutions (admin) ──────────────────────────────────────────

/**
 * Admin create/edit form for public.education_institutions. The unique
 * partial index (lower(name), coalesce(city,''), type) WHERE is_active
 * handles dedup on the DB side, but we still guard the inputs so admins
 * get useful error messages before round-tripping.
 */
export const educationInstitutionFormSchema = z.object({
  name: nameField(160),
  name_bn: optionalText(200),
  type: z.enum(EDUCATION_INSTITUTION_TYPES, { message: 'Choose a type' }),
  ownership_type: z.preprocess(
    emptyToNull,
    z
      .enum(EDUCATION_INSTITUTION_OWNERSHIPS, { message: 'Invalid ownership' })
      .nullable(),
  ),
  city: optionalText(80),
  area: optionalText(120),
  is_active: z.preprocess(
    (value) => (typeof value === 'string' ? value === 'on' || value === 'true' : Boolean(value)),
    z.boolean(),
  ),
});

export const educationInstitutionUpdateSchema = educationInstitutionFormSchema.extend({
  id: uuidField('Invalid institution id'),
});
