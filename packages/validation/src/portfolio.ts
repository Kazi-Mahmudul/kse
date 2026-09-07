import { z } from 'zod';

import { SKILL_LEVELS } from '@kse/types';

/** Portfolio CRUD schemas (spec §6 "Profile" — projects, certificates,
 *  achievements, research, resume, portfolio links). */

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

export const certificateSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(120),
  issuer: z.string().trim().max(120).or(z.literal('')),
  issued_on: optionalDate,
  file_url: optionalUrl,
});

export type CertificateInput = z.infer<typeof certificateSchema>;

export const certificateFormSchema = certificateSchema;
export type CertificateFormValues = CertificateInput;

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
  file_url: z
    .string()
    .trim()
    .url('Enter a valid URL pointing to your resume PDF'),
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
  skill_id: z.string().uuid(),
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
