import {
  DEGREE_LEVEL_LABELS,
  EDUCATION_LEVEL_LABELS,
} from '@kse/shared';
import type {
  OpportunityEligibility,
  ScholarshipMatch,
  ScholarshipMatchLevel,
  ScholarshipMatchReason,
} from '@kse/types';

/**
 * Rule-based scholarship matcher. Lives on the mobile client today;
 * structured so the same logic can move into a Supabase Edge Function
 * (or a scheduled job) without changing the result shape.
 *
 * Inputs:
 * - `eligibility` is one row from public.opportunity_eligibility (or null).
 * - `profile` is a normalised snapshot of the student's profile — every
 *   field is optional, so missing data counts as "no signal" rather than
 *   "not eligible" (the reason copy reflects that).
 *
 * Deliberately out of scope: country / nationality rules. KSE serves
 * Bangladeshi students only — every profile's country is Bangladesh and
 * there is no nationality field — so geography can never exclude anyone.
 * The `countries` / `nationalities` columns on the eligibility row stay
 * purely informational ("open to Bangladeshi students").
 *
 * Output:
 * - `level` collapses the rule outcomes into one of three buckets.
 * - `reasons` is the human-readable explanation used on the detail page
 *   and the Scholarship Hub match badge.
 */

export interface MatchingProfile {
  /** Most recent (or current) education entry's CGPA on its native scale. */
  cgpa?: number | null;
  cgpa_scale?: number | null;
  /** Education levels currently or recently held (e.g. bachelor, masters). */
  degree_levels?: string[];
  /** Program / major / field keywords (free text — matched against `fields`). */
  fields?: string[];
  /** Latest test scores the student has recorded (per-type → highest). */
  test_scores?: Partial<Record<
    'ielts' | 'toefl' | 'pte' | 'gre' | 'duolingo' | 'oet' | 'toeic' | 'met' | 'moi' | 'other',
    number
  >>;
  has_research?: boolean;
  has_publication?: boolean;
  has_work_experience?: boolean;
  has_project_experience?: boolean;
  has_leadership_activity?: boolean;
  has_any_activity?: boolean;
}

const passed = (rule: ScholarshipMatchReason['rule'], message: string): ScholarshipMatchReason => ({
  rule,
  passed: true,
  message,
});
const failed = (
  rule: ScholarshipMatchReason['rule'],
  message: string,
): ScholarshipMatchReason => ({
  rule,
  passed: false,
  message,
});

/** Normalise a CGPA to a 4.00 scale so two schools' GPAs compare fairly. */
function normaliseCgpa(value: number, scale: number | null | undefined): number {
  const safeScale = scale && scale > 0 ? scale : 4;
  return (value / safeScale) * 4;
}

/**
 * Ladder positions for study levels, used by the degree-level rule.
 * A scholarship "funds" a level (e.g. a master's degree); the student
 * qualifies when their highest education sits at or below that rung —
 * a bachelor student is exactly who a master's scholarship is for.
 * `other` / unmapped levels carry no signal.
 */
const EDUCATION_RANKS: Record<string, number> = {
  primary_psc: 1,
  jsc: 2,
  ssc: 3,
  hsc: 4,
  diploma: 4,
  certificate_course: 4,
  bachelor: 5,
  masters: 6,
  mphil: 7,
  phd: 8,
};
/** `opportunity_eligibility.degree_levels` uses the DegreeLevel enum; map
 *  it onto the same ladder (undergraduate ≡ a completed bachelor). */
const DEGREE_LEVEL_RANKS: Record<string, number> = {
  diploma: 4,
  undergraduate: 5,
  masters: 6,
  phd: 8,
};

export function evaluateMatch(
  eligibility: OpportunityEligibility | null,
  profile: MatchingProfile,
): ScholarshipMatch {
  const reasons: ScholarshipMatchReason[] = [];

  // No eligibility row at all → treat as "no constraints", eligible by default.
  if (!eligibility) {
    return { opportunity_id: '', level: 'eligible', reasons: [] };
  }
  const opportunityId = eligibility.opportunity_id;

  // 1. CGPA
  if (eligibility.min_cgpa != null) {
    const scale = eligibility.cgpa_scale ?? profile.cgpa_scale ?? null;
    if (profile.cgpa != null && scale) {
      const normalised = normaliseCgpa(profile.cgpa, profile.cgpa_scale ?? scale);
      if (normalised >= eligibility.min_cgpa) {
        reasons.push(passed('cgpa', `CGPA requirement (${eligibility.min_cgpa}) satisfied.`));
      } else {
        reasons.push(
          failed(
            'cgpa',
            `Minimum CGPA is ${eligibility.min_cgpa}; your latest CGPA is ${profile.cgpa.toFixed(2)}.`,
          ),
        );
      }
    } else {
      reasons.push(
        failed('cgpa', `Minimum CGPA ${eligibility.min_cgpa} — add your latest CGPA on Education.`),
      );
    }
  }

  // 2. Degree level — "can the student pursue this level?" The scholarship
  // funds its eligible levels; the student qualifies while their highest
  // education is at or below the highest funded rung (they haven't already
  // moved past it).
  if (eligibility.degree_levels.length > 0) {
    const fundedRanks = eligibility.degree_levels
      .map((level) => DEGREE_LEVEL_RANKS[level])
      .filter((rank): rank is number => rank != null);
    const heldRanks = (profile.degree_levels ?? [])
      .map((level) => EDUCATION_RANKS[level])
      .filter((rank): rank is number => rank != null);

    if (fundedRanks.length > 0) {
      const fundedMax = Math.max(...fundedRanks);
      const fundedLabels = eligibility.degree_levels
        .map((level) => DEGREE_LEVEL_LABELS[level as keyof typeof DEGREE_LEVEL_LABELS] ?? level)
        .join(', ');
      if (heldRanks.length === 0) {
        reasons.push(
          failed(
            'degree_level',
            `Funds ${fundedLabels}. Add your education on Portfolio → Education to verify your level.`,
          ),
        );
      } else if (Math.max(...heldRanks) <= fundedMax) {
        reasons.push(passed('degree_level', `Funds ${fundedLabels} — your education level qualifies.`));
      } else {
        const highestHeld = (profile.degree_levels ?? [])
          .filter((level) => EDUCATION_RANKS[level] != null)
          .sort((a, b) => EDUCATION_RANKS[b] - EDUCATION_RANKS[a])[0];
        reasons.push(
          failed(
            'degree_level',
            `Funds ${fundedLabels}; your highest education (${
              EDUCATION_LEVEL_LABELS[highestHeld as keyof typeof EDUCATION_LEVEL_LABELS] ?? highestHeld
            }) is already above that level.`,
          ),
        );
      }
    }
  }

  // 3. Field / major
  if (eligibility.fields.length > 0) {
    const own = (profile.fields ?? []).map((s) => s.toLowerCase());
    const matched = eligibility.fields.some((field) =>
      own.some((held) => held.includes(field.toLowerCase())),
    );
    if (matched) {
      reasons.push(passed('field', 'Field of study matches.'));
    } else {
      reasons.push(
        failed(
          'field',
          `Eligible fields: ${eligibility.fields.join(', ')}. Add matching programs on Education.`,
        ),
      );
    }
  }

  // 4. English / standardised tests
  const scores = profile.test_scores ?? {};
  type TestKey = 'ielts' | 'toefl' | 'pte' | 'gre';
  interface TestCheck {
    key: TestKey;
    min: number | null | undefined;
    actual: number | null | undefined;
  }
  const testChecks: TestCheck[] = [
    { key: 'ielts', min: eligibility.ielts_min, actual: scores.ielts ?? null },
    { key: 'toefl', min: eligibility.toefl_min, actual: scores.toefl ?? null },
    { key: 'pte', min: eligibility.pte_min, actual: scores.pte ?? null },
    { key: 'gre', min: eligibility.gre_min, actual: scores.gre ?? null },
  ];
  for (const { key, min, actual } of testChecks) {
    if (min == null) continue;
    if (actual == null) {
      reasons.push(
        failed(key, `Minimum ${key.toUpperCase()} ${min} — add your score on Profile.`),
      );
      continue;
    }
    if (actual >= min) {
      reasons.push(passed(key, `${key.toUpperCase()} requirement (${min}) satisfied.`));
    } else {
      reasons.push(
        failed(
          key,
          `Minimum ${key.toUpperCase()} is ${min}; your latest ${key.toUpperCase()} is ${actual}.`,
        ),
      );
    }
  }

  // 5. Activity signals
  type ActivityCheck = [
    ScholarshipMatchReason['rule'],
    boolean | undefined,
    boolean,
    string,
  ];
  const activityChecks: ActivityCheck[] = [
    ['research', profile.has_research, eligibility.requires_research, 'Research experience'],
    ['publication', profile.has_publication, eligibility.requires_publication, 'A publication'],
    ['work_experience', profile.has_work_experience, eligibility.requires_work_experience, 'Work experience'],
    ['project_experience', profile.has_project_experience, eligibility.requires_project_experience, 'A project'],
    ['leadership', profile.has_leadership_activity, eligibility.requires_leadership, 'A leadership role'],
    ['extracurricular', profile.has_any_activity, eligibility.requires_extracurricular, 'An activity'],
  ];
  for (const [rule, has, requires, label] of activityChecks) {
    if (!requires) continue;
    if (has) {
      reasons.push(passed(rule, `${label} recorded in your portfolio.`));
    } else {
      reasons.push(failed(rule, `${label} required but not found in your profile.`));
    }
  }

  // 6. Has any test score at all (independent of minimums)
  if (eligibility.requires_test_score) {
    const anyTest = Object.values(scores).some((v) => v != null);
    if (anyTest) {
      reasons.push(passed('test_score_present', 'Test score recorded.'));
    } else {
      reasons.push(
        failed('test_score_present', 'A standardised test score is required.'),
      );
    }
  }

  // Roll up into a level. No constraints → eligible. One miss → potential
  // ("you're close"); two or more → not eligible.
  const failedCount = reasons.filter((r) => !r.passed).length;

  let level: ScholarshipMatchLevel;
  if (failedCount === 0) {
    level = 'eligible';
  } else if (failedCount === 1) {
    level = 'potential';
  } else {
    level = 'not_eligible';
  }

  return { opportunity_id: opportunityId, level, reasons };
}
