import { z } from 'zod';

import {
  CERTIFICATE_TYPES,
  EDUCATION_BOARDS,
  EDUCATION_LEVELS,
  EDUCATION_RESULT_SCALES,
  EDUCATION_RESULT_TYPES,
  SKILL_LEVELS,
  STUDY_GROUPS,
} from '@kse/types';

import { uuidField } from './common';

/** Portfolio CRUD schemas (spec §6 "Profile" — education, projects,
 *  certificates, achievements, research, resume, portfolio links). */

/** Optional URL field: empty string becomes null in the mapper. */
const optionalUrl = z
  .string()
  .trim()
  .url('Enter a valid URL (https://…)')
  .or(z.literal(''));

/** Optional ISO date string ("YYYY-MM-DD") used for date inputs. */
const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Use YYYY-MM-DD')
  .or(z.literal(''));

/** Select-backed enum field: '' = "not chosen yet" (mapped to null on save). */
function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values).or(z.literal(''));
}

/**
 * Uploaded-file reference: either an https URL (external link, or legacy
 * certificate rows) or a storage path inside the private `certificates`
 * bucket (`<auth.uid()>/<unique>.<ext>` — set by the upload field, never
 * typed by the user).
 */
const fileRef = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === '' ||
      /^https?:\/\/\S+$/iu.test(value) ||
      /^[^/\s]+\/[^/\s]\S*$/u.test(value),
    'Enter a valid https URL or upload a file',
  );

/** Optional 4-digit year string; range is checked in the education refine. */
const optionalYear = z
  .string()
  .trim()
  .regex(/^\d{4}$/u, 'Enter a 4-digit year (e.g. 2024)')
  .or(z.literal(''));

const MIN_EDUCATION_YEAR = 1980;
/** Allows expected graduation years a few years out (ongoing degrees). */
const MAX_EDUCATION_YEAR = new Date().getFullYear() + 8;

// ── Projects ────────────────────────────────────────────────────────────────

export const projectSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(120),
  description: z.string().trim().max(2000).or(z.literal('')),
  url: optionalUrl,
  tech_stack: z.array(z.string().trim().min(1).max(40)).max(20),
  started_on: optionalDate,
  completed_on: optionalDate,
});

export type ProjectInput = z.infer<typeof projectSchema>;

export const projectFormSchema = projectSchema;
export type ProjectFormValues = ProjectInput;

// ── Certificates ────────────────────────────────────────────────────────────

export const certificateSchema = z
  .object({
    title: z.string().trim().min(2, 'Title is required').max(120),
    certificate_type: optionalEnum(CERTIFICATE_TYPES),
    issuer: z.string().trim().max(120).or(z.literal('')),
    program_name: z.string().trim().max(160).or(z.literal('')),
    issued_on: optionalDate,
    expires_on: optionalDate,
    credential_id: z.string().trim().max(80).or(z.literal('')),
    credential_url: optionalUrl,
    verification_url: optionalUrl,
    description: z.string().trim().max(500).or(z.literal('')),
    file_url: fileRef,
  })
  .superRefine((values, ctx) => {
    if (values.certificate_type === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['certificate_type'],
        message: 'Select a certificate type',
      });
    }
    if (
      values.issued_on !== '' &&
      values.expires_on !== '' &&
      values.expires_on < values.issued_on
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['expires_on'],
        message: 'Expiry date must be after the issue date',
      });
    }
  });

export type CertificateInput = z.infer<typeof certificateSchema>;

export const certificateFormSchema = certificateSchema;
export type CertificateFormValues = CertificateInput;

// ── Education (Bangladesh education system) ──────────────────────────────────

/**
 * One flat string-typed shape for every education level. Which fields are
 * required depends on `level` (SSC needs board + group + GPA, a bachelor's
 * needs degree + program + start year, MPhil/PhD need a research area), so
 * the per-level rules live in the superRefine below rather than in a
 * discriminated union — RHF keeps one stable form type while the UI renders
 * only the fields the selected level actually uses.
 */
export const educationFormSchema = z
  .object({
    level: optionalEnum(EDUCATION_LEVELS),
    institution: z.string().trim().min(2, 'Institution name is required').max(160),
    board: optionalEnum(EDUCATION_BOARDS),
    study_group: optionalEnum(STUDY_GROUPS),
    degree_type: z.string().trim().max(20).or(z.literal('')),
    program_name: z.string().trim().max(160).or(z.literal('')),
    major: z.string().trim().max(160).or(z.literal('')),
    campus: z.string().trim().max(160).or(z.literal('')),
    research_area: z.string().trim().max(160).or(z.literal('')),
    thesis_title: z.string().trim().max(200).or(z.literal('')),
    supervisor: z.string().trim().max(120).or(z.literal('')),
    roll_number: z.string().trim().max(30).or(z.literal('')),
    registration_number: z.string().trim().max(40).or(z.literal('')),
    start_year: optionalYear,
    passing_year: optionalYear,
    is_ongoing: z.boolean(),
    result_type: optionalEnum(EDUCATION_RESULT_TYPES),
    result: z.string().trim().max(30).or(z.literal('')),
    result_scale: optionalEnum(EDUCATION_RESULT_SCALES),
    document_url: fileRef,
  })
  .superRefine((v, ctx) => {
    const add = (path: (keyof typeof v)[] | string[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (v.level === '') {
      add(['level'], 'Select your education level');
      return;
    }

    // Years must be plausible and ordered.
    const start = v.start_year === '' ? null : Number(v.start_year);
    const passing = v.passing_year === '' ? null : Number(v.passing_year);
    for (const [path, year] of [
      ['start_year', start],
      ['passing_year', passing],
    ] as const) {
      if (year !== null && (year < MIN_EDUCATION_YEAR || year > MAX_EDUCATION_YEAR)) {
        add(
          [path],
          `Year must be between ${MIN_EDUCATION_YEAR} and ${MAX_EDUCATION_YEAR}`,
        );
      }
    }
    if (start !== null && passing !== null && start > passing) {
      add(['passing_year'], 'Passing year cannot be before the start year');
    }
    if (!v.is_ongoing && passing === null) {
      add(['passing_year'], 'Passing year is required');
    }

    // Per-level required fields (spec: Bangladesh education system).
    if (v.level === 'ssc' || v.level === 'hsc') {
      if (v.board === '') add(['board'], 'Board is required');
      if (v.study_group === '') add(['study_group'], 'Group is required');
    }
    if (v.level === 'diploma' || v.level === 'certificate_course') {
      if (v.program_name === '')
        add(['program_name'], v.level === 'diploma' ? 'Program is required' : 'Course name is required');
    }
    if (v.level === 'bachelor' || v.level === 'masters') {
      if (v.degree_type === '') add(['degree_type'], 'Degree type is required');
      if (v.program_name === '') add(['program_name'], 'Program name is required');
    }
    if (v.level === 'bachelor' && start === null) {
      add(['start_year'], 'Start year is required');
    }
    if (v.level === 'mphil' || v.level === 'phd') {
      if (v.research_area === '') add(['research_area'], 'Research area is required');
    }

    // Result must match its declared type and stay within the chosen scale.
    // Implicit scales (SSC/HSC GPA 5.00, university CGPA 4.00) keep the form
    // forgiving; percentage is always out of 100.
    const scale = v.result_scale === '' ? null : Number(v.result_scale);
    if (v.result_type === 'gpa' || v.result_type === 'cgpa') {
      const max = scale ?? (v.result_type === 'gpa' ? 5 : 4);
      if (v.result === '') {
        add(['result'], 'Result is required');
      } else if (!/^\d{1,3}(\.\d{1,2})?$/u.test(v.result) || Number(v.result) <= 0 || Number(v.result) > max) {
        add(['result'], `Result must be a number between 0 and ${max}`);
      }
    } else if (v.result_type === 'percentage') {
      if (v.result === '') {
        add(['result'], 'Result is required');
      } else if (!/^\d{1,3}(\.\d{1,2})?$/u.test(v.result) || Number(v.result) > 100) {
        add(['result'], 'Percentage must be between 0 and 100');
      }
    } else if (v.result_type === 'division' && v.result === '') {
      add(['result'], 'Result is required (e.g. First Class)');
    } else if (v.result_type === '' && v.result !== '') {
      add(['result_type'], 'Select a result type first');
    }
  });

export type EducationFormValues = z.infer<typeof educationFormSchema>;

// ── Achievements ────────────────────────────────────────────────────────────

export const achievementSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(120),
  description: z.string().trim().max(500).or(z.literal('')),
  achieved_on: optionalDate,
});

export type AchievementInput = z.infer<typeof achievementSchema>;

export const achievementFormSchema = achievementSchema;
export type AchievementFormValues = AchievementInput;

// ── Research ────────────────────────────────────────────────────────────────

export const researchSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(200),
  abstract: z.string().trim().max(2000).or(z.literal('')),
  role: z.string().trim().max(120).or(z.literal('')),
  collaborators: z.array(z.string().trim().min(1).max(60)).max(20),
  url: optionalUrl,
  published_on: optionalDate,
});

export type ResearchInput = z.infer<typeof researchSchema>;

export const researchFormSchema = researchSchema;
export type ResearchFormValues = ResearchInput;

// ── Resume entries ──────────────────────────────────────────────────────────

export const resumeSchema = z.object({
  // Storage path (`resumes/<uid>/<file>.pdf`) or an external https link.
  file_url: fileRef,
  /** Original filename of the upload — display-only, blank for links. */
  file_name: z.string().trim().max(200),
  is_primary: z.boolean(),
});

export type ResumeInput = z.infer<typeof resumeSchema>;

export const resumeFormSchema = resumeSchema;
export type ResumeFormValues = ResumeInput;

// ── Portfolio links ─────────────────────────────────────────────────────────

export const portfolioLinkSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(60),
  url: z.string().trim().url('Enter a valid URL'),
});

export type PortfolioLinkInput = z.infer<typeof portfolioLinkSchema>;

export const portfolioLinkFormSchema = portfolioLinkSchema;
export type PortfolioLinkFormValues = PortfolioLinkInput;

// ── Skills (level) ──────────────────────────────────────────────────────────

export const skillLevelSchema = z.enum(SKILL_LEVELS);

export const userSkillSchema = z.object({
  skill_id: uuidField(),
  level: skillLevelSchema,
});

export type UserSkillInput = z.infer<typeof userSkillSchema>;

// ── Empty-string → null mappers (callers apply these before insert) ────────

export function blankToNull<T extends Record<string, unknown>>(
  record: T,
): T {
  const out: Record<string, unknown> = { ...record };
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (value === '') out[key] = null;
  }
  return out as T;
}
