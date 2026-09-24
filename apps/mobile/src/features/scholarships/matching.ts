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
 * Output:
 * - `level` collapses the rule outcomes into one of four buckets.
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
  /** Student's country of citizenship / residence. */
  country?: string | null;
  /** Student's nationality / citizenship codes (ISO-2 or full names). */
  nationalities?: string[];
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

  // 2. Degree level
  if (eligibility.degree_levels.length > 0) {
    const held = profile.degree_levels ?? [];
    const matched = eligibility.degree_levels.some((level) => held.includes(level));
    if (matched) {
      reasons.push(passed('degree_level', 'Education level matches.'));
    } else {
      const allowed = eligibility.degree_levels.join(', ');
      reasons.push(
        failed(
          'degree_level',
          held.length > 0
            ? `Eligible levels: ${allowed}; your portfolio lists ${held.join(', ')}.`
            : `Eligible levels: ${allowed}. Add your education level to verify.`,
        ),
      );
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

  // 4. Country (eligible country list — student lives there)
  if (eligibility.countries.length > 0) {
    const studentCountry = profile.country?.trim();
    if (!studentCountry) {
      reasons.push(
        failed('country', `Eligible countries: ${eligibility.countries.join(', ')}.`),
      );
    } else if (
      eligibility.countries.some((c) => c.toLowerCase() === studentCountry.toLowerCase())
    ) {
      reasons.push(passed('country', `Country (${studentCountry}) is eligible.`));
    } else {
      reasons.push(
        failed(
          'country',
          `Eligible countries: ${eligibility.countries.join(', ')}; your country is ${studentCountry}.`,
        ),
      );
    }
  }

  // 5. Nationality
  if (eligibility.nationalities.length > 0) {
    const nationalities = (profile.nationalities ?? []).map((n) => n.toLowerCase());
    const matched = eligibility.nationalities.some((n) =>
      nationalities.includes(n.toLowerCase()),
    );
    if (matched) {
      reasons.push(passed('nationality', 'Nationality is eligible.'));
    } else {
      reasons.push(
        failed(
          'nationality',
          `Eligible nationalities: ${eligibility.nationalities.join(', ')}.`,
        ),
      );
    }
  }

  // 6. English / standardised tests
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

  // 7. Activity signals
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

  // 8. Has any test score at all (independent of minimums)
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

  // Roll up into a level. No constraints → eligible.
  const failed_ = reasons.filter((r) => !r.passed);
  const passed_ = reasons.filter((r) => r.passed);

  let level: ScholarshipMatchLevel;
  if (reasons.length === 0) {
    level = 'eligible';
  } else if (failed_.length === 0) {
    level = passed_.length >= 5 ? 'highly_matched' : 'eligible';
  } else if (failed_.length <= 1) {
    level = 'potential';
  } else {
    level = 'not_eligible';
  }

  return { opportunity_id: opportunityId, level, reasons };
}
