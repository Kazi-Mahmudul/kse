import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type {
  OpportunityEligibility,
  ScholarshipMatch,
  TestScoreType,
} from '@kse/types';

import { evaluateMatch, type MatchingProfile } from './matching';
import {
  scholarshipKeys,
  useEligibilityFor,
  useMyActivities,
  useMyTestScores,
} from './queries';

/**
 * Reads the student's profile snapshot used by the matching engine. The
 * underlying tables are all owner-RLS, so the joined read picks up only
 * the caller's rows. Returns a `MatchingProfile` that's deliberately
 * partial — missing fields are treated as "no signal", never as "fail".
 */
async function loadMatchingProfile(): Promise<MatchingProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {};
  }

  // Single round-trip for the most-read side tables — education is the
  // source of CGPA + degree level + field; portfolio rows reveal
  // research/project presence. (CV "primary" signal is wired via the
  // profile-completion check below; the matching engine itself doesn't
  // care about which CV is primary.)
  const [educationRes, projectsRes, researchRes] = await Promise.all([
    supabase
      .from('user_education')
      .select('level, major, program_name, result, result_scale, is_ongoing')
      .eq('user_id', user.id)
      .order('passing_year', { ascending: false, nullsFirst: true })
      .order('start_year', { ascending: false, nullsFirst: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('user_projects')
      .select('id')
      .eq('user_id', user.id)
      .limit(1),
    supabase
      .from('user_research')
      .select('id')
      .eq('user_id', user.id)
      .limit(1),
  ]);

  const educationRows = (educationRes.data ?? []) as {
    level: string | null;
    major: string | null;
    program_name: string | null;
    result: string | null;
    result_scale: number | null;
    is_ongoing: boolean;
  }[];

  // Latest education row whose result is a numeric CGPA / GPA wins.
  const cgpaRow = educationRows.find(
    (row) =>
      row.result != null &&
      row.result.trim() !== '' &&
      Number.isFinite(Number(row.result)) &&
      row.result_scale != null,
  );
  const cgpa = cgpaRow ? Number(cgpaRow.result) : null;
  const cgpaScale = cgpaRow?.result_scale ?? null;

  const degreeLevels = Array.from(
    new Set(educationRows.map((row) => row.level).filter((v): v is string => Boolean(v))),
  );
  const fields = Array.from(
    new Set(
      educationRows
        .flatMap((row) => [row.major, row.program_name])
        .filter((v): v is string => Boolean(v)),
    ),
  );

  return {
    cgpa,
    cgpa_scale: cgpaScale,
    degree_levels: degreeLevels,
    fields,
    has_research: (researchRes.data ?? []).length > 0,
    has_publication: (researchRes.data ?? []).length > 0,
    has_project_experience: (projectsRes.data ?? []).length > 0,
    has_any_activity: false, // patched in below by useMyActivities result
    // Country / nationality / test_scores are filled in client-side once
    // the queries resolve (they need joins that are easier to do as
    // separate queries than as a single RPC).
  };
}

/** Returns the highest test score per type — what the matcher consumes. */
function pickHighestScore(
  rows: { test_type: TestScoreType; score: string }[],
): Partial<Record<TestScoreType, number>> {
  const best = new Map<TestScoreType, number>();
  for (const row of rows) {
    const value = Number(row.score);
    if (!Number.isFinite(value)) continue;
    const prev = best.get(row.test_type);
    if (prev == null || value > prev) best.set(row.test_type, value);
  }
  return Object.fromEntries(best.entries()) as Partial<Record<TestScoreType, number>>;
}

interface UseScholarshipMatcherArgs {
  /** Opportunity IDs to evaluate. The hook fetches eligibility for these
   *  once and runs the engine client-side. */
  opportunityIds: readonly string[];
  /** Country / nationality of the student; pulled from profile where it lives. */
  country?: string | null;
  nationalities?: string[];
}

/** Returns a stable query for the matching profile snapshot. */
export function useMatchingProfile() {
  return useQuery({
    queryKey: [...scholarshipKeys.all, 'matching-profile'] as const,
    queryFn: loadMatchingProfile,
    staleTime: 60_000,
  });
}

/** Evaluate `evaluateMatch` against a set of opportunities. */
export function useScholarshipMatcher({
  opportunityIds,
  country,
  nationalities,
}: UseScholarshipMatcherArgs) {
  const profileQuery = useMatchingProfile();
  const eligibilityQuery = useEligibilityFor(opportunityIds);
  const testScoresQuery = useMyTestScores();
  const activitiesQuery = useMyActivities();

  const profile: MatchingProfile = {
    ...(profileQuery.data ?? {}),
    test_scores: pickHighestScore(testScoresQuery.data ?? []),
    has_any_activity: (activitiesQuery.data ?? []).length > 0,
    has_leadership_activity: (activitiesQuery.data ?? []).some(
      (row) => row.activity_type === 'leadership',
    ),
    country: country ?? null,
    nationalities: nationalities ?? [],
  };

  const matches: ScholarshipMatch[] = opportunityIds.map((id) => {
    const eligibility: OpportunityEligibility | null =
      (eligibilityQuery.data?.get(id) as OpportunityEligibility | undefined) ?? null;
    const result = evaluateMatch(eligibility, profile);
    if (!result.opportunity_id) result.opportunity_id = id;
    return result;
  });

  const isLoading =
    profileQuery.isLoading ||
    eligibilityQuery.isLoading ||
    testScoresQuery.isLoading ||
    activitiesQuery.isLoading;

  return { matches, profile, isLoading };
}
