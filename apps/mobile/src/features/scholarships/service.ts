import { supabase } from '@/lib/supabase';
import type {
  OpportunityEligibility,
  ScholarshipApplication,
  ScholarshipApplicationStatus,
  UserActivity,
  UserTestScore,
} from '@kse/types';

/**
 * Scholarship-side-table service. The scholarship opportunity rows
 * themselves are read through the existing `opportunities` service —
 * this module owns eligibility rows (matching rules), student test
 * scores, student activities, and the application tracker.
 *
 * All writes go through the authenticated client; RLS on each table
 * already enforces owner-only CRUD where appropriate.
 */

export class ScholarshipError extends Error {}

function fail(context: string, message: string | null): never {
  throw new ScholarshipError(`${context}: ${message ?? 'unknown error'}`);
}

// ── opportunity_eligibility ────────────────────────────────────────────────

const ELIGIBILITY_COLUMNS =
  'opportunity_id, min_cgpa, cgpa_scale, degree_levels, fields, countries, nationalities, ielts_min, toefl_min, pte_min, gre_min, requires_research, requires_publication, requires_work_experience, requires_project_experience, requires_leadership, requires_extracurricular, requires_test_score, required_documents, other_requirements';

/** One eligibility row per opportunity. Missing rows mean "no constraints". */
export async function listEligibilityForOpportunities(
  opportunityIds: readonly string[],
): Promise<Map<string, OpportunityEligibility>> {
  const map = new Map<string, OpportunityEligibility>();
  if (opportunityIds.length === 0) return map;
  const { data, error } = await supabase
    .from('opportunity_eligibility')
    .select(ELIGIBILITY_COLUMNS)
    .in('opportunity_id', [...opportunityIds]);
  if (error) fail('Could not load eligibility', error.message);
  for (const row of (data ?? []) as OpportunityEligibility[]) {
    map.set(row.opportunity_id, row);
  }
  return map;
}

// ── user_test_scores ───────────────────────────────────────────────────────

const TEST_SCORE_COLUMNS =
  'id, user_id, test_type, score, test_date, expires_on, created_at, updated_at';

export interface UpsertTestScoreInput {
  test_type: UserTestScore['test_type'];
  score: string;
  test_date?: string | null;
  expires_on?: string | null;
}

export async function listMyTestScores(): Promise<UserTestScore[]> {
  const { data, error } = await supabase
    .from('user_test_scores')
    .select(TEST_SCORE_COLUMNS)
    .order('test_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load test scores', error.message);
  return (data ?? []) as UserTestScore[];
}

async function requireUserId(context: string): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) fail(context, 'You need to sign in first');
  return user.id;
}

export async function createTestScore(input: UpsertTestScoreInput): Promise<UserTestScore> {
  const userId = await requireUserId('Could not save the test score');
  const { data, error } = await supabase
    .from('user_test_scores')
    .insert({
      user_id: userId,
      test_type: input.test_type,
      score: input.score.trim(),
      test_date: input.test_date ?? null,
      expires_on: input.expires_on ?? null,
    })
    .select(TEST_SCORE_COLUMNS)
    .single();
  if (error || !data) fail('Could not save the test score', error?.message ?? null);
  return data as UserTestScore;
}

export async function updateTestScore(
  id: string,
  input: UpsertTestScoreInput,
): Promise<UserTestScore> {
  const { data, error } = await supabase
    .from('user_test_scores')
    .update({
      test_type: input.test_type,
      score: input.score.trim(),
      test_date: input.test_date ?? null,
      expires_on: input.expires_on ?? null,
    })
    .eq('id', id)
    .select(TEST_SCORE_COLUMNS)
    .single();
  if (error || !data) fail('Could not update the test score', error?.message ?? null);
  return data as UserTestScore;
}

export async function deleteTestScore(id: string): Promise<void> {
  const { error } = await supabase.from('user_test_scores').delete().eq('id', id);
  if (error) fail('Could not delete the test score', error.message);
}

// ── user_activities ────────────────────────────────────────────────────────

const ACTIVITY_COLUMNS =
  'id, user_id, activity_type, title, organization, role, start_date, end_date, is_ongoing, description, created_at, updated_at';

export interface UpsertActivityInput {
  activity_type: UserActivity['activity_type'];
  title: string;
  organization?: string | null;
  role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean;
  description?: string | null;
}

export async function listMyActivities(): Promise<UserActivity[]> {
  const { data, error } = await supabase
    .from('user_activities')
    .select(ACTIVITY_COLUMNS)
    .order('is_ongoing', { ascending: false })
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load activities', error.message);
  return (data ?? []) as UserActivity[];
}

export async function createActivity(input: UpsertActivityInput): Promise<UserActivity> {
  const userId = await requireUserId('Could not save the activity');
  const { data, error } = await supabase
    .from('user_activities')
    .insert({
      user_id: userId,
      activity_type: input.activity_type,
      title: input.title.trim(),
      organization: input.organization ?? null,
      role: input.role ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      is_ongoing: input.is_ongoing ?? false,
      description: input.description ?? null,
    })
    .select(ACTIVITY_COLUMNS)
    .single();
  if (error || !data) fail('Could not save the activity', error?.message ?? null);
  return data as UserActivity;
}

export async function updateActivity(
  id: string,
  input: UpsertActivityInput,
): Promise<UserActivity> {
  const { data, error } = await supabase
    .from('user_activities')
    .update({
      activity_type: input.activity_type,
      title: input.title.trim(),
      organization: input.organization ?? null,
      role: input.role ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      is_ongoing: input.is_ongoing ?? false,
      description: input.description ?? null,
    })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single();
  if (error || !data) fail('Could not update the activity', error?.message ?? null);
  return data as UserActivity;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('user_activities').delete().eq('id', id);
  if (error) fail('Could not delete the activity', error.message);
}

// ── scholarship_applications ───────────────────────────────────────────────

const APPLICATION_COLUMNS =
  'id, user_id, opportunity_id, status, notes, submitted_at, created_at, updated_at';

export async function listMyApplications(): Promise<ScholarshipApplication[]> {
  const { data, error } = await supabase
    .from('scholarship_applications')
    .select(APPLICATION_COLUMNS)
    .order('updated_at', { ascending: false });
  if (error) fail('Could not load applications', error.message);
  return (data ?? []) as ScholarshipApplication[];
}

export interface UpsertApplicationInput {
  opportunity_id: string;
  status: ScholarshipApplicationStatus;
  notes?: string | null;
  submitted_at?: string | null;
}

export async function upsertApplication(
  input: UpsertApplicationInput,
): Promise<ScholarshipApplication> {
  const userId = await requireUserId('Could not save the application');
  const payload = {
    user_id: userId,
    opportunity_id: input.opportunity_id,
    status: input.status,
    notes: input.notes ?? null,
    submitted_at: input.status === 'applied' || input.status === 'selected'
      ? input.submitted_at ?? new Date().toISOString()
      : input.submitted_at ?? null,
  };
  const { data, error } = await supabase
    .from('scholarship_applications')
    .upsert(payload, { onConflict: 'user_id,opportunity_id' })
    .select(APPLICATION_COLUMNS)
    .single();
  if (error || !data) fail('Could not save the application', error?.message ?? null);
  return data as ScholarshipApplication;
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase
    .from('scholarship_applications')
    .delete()
    .eq('id', id);
  if (error) fail('Could not remove the application', error.message);
}
