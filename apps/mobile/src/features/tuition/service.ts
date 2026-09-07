import { supabase } from '@/lib/supabase';
import type { Subject, TutorListItem, TuitionRequestRow } from '@kse/types';
import { tuitionRequestSchema, type TuitionRequestInput } from '@kse/validation';

/**
 * Tuition discovery + request workflow (spec §6, CLAUDE.md §2 "discovery +
 * contact/request"). RLS shows verified/active tutors only; names come from a
 * profiles merge because tutors↔profiles share no FK (PostgREST cannot embed).
 */

export class TuitionError extends Error {}

function fail(context: string, message: string): never {
  throw new TuitionError(`${context}: ${message}`);
}

export interface TutorFilters {
  /** Free-text query matched against headline / location / bio. */
  q?: string;
  /** Exact subject chip selection. */
  subjectId?: string;
}

export interface TutorPage {
  rows: TutorListItem[];
  page: number;
  hasMore: boolean;
}

interface TutorRow {
  id: string;
  headline: string;
  bio: string | null;
  location: string | null;
  availability: string | null;
  expected_fee_min: number | null;
  expected_fee_max: number | null;
  is_verified: boolean;
  university: { name: string } | null;
  tutor_subjects: { subjects: { name: string } | null }[];
}

const TUTOR_SELECT =
  'id, headline, bio, location, availability, expected_fee_min, expected_fee_max, ' +
  'is_verified, university:universities(name), tutor_subjects(subjects(name))';

/** Subject filtering needs !inner: without it the embedded filter only empties
 *  the child array and every tutor still comes back (left-join semantics). */
const TUTOR_SELECT_BY_SUBJECT =
  'id, headline, bio, location, availability, expected_fee_min, expected_fee_max, ' +
  'is_verified, university:universities(name), tutor_subjects!inner(subjects(name))';

async function fetchProfileNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids);
  if (error) fail('Could not load tutors', error.message);
  const names = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; full_name: string | null }[]) {
    names.set(row.id, row.full_name ?? 'Tutor');
  }
  return names;
}

function toListItem(row: TutorRow, fallbackName: string): TutorListItem {
  return {
    id: row.id,
    fullName: fallbackName,
    headline: row.headline,
    bio: row.bio,
    location: row.location,
    availability: row.availability,
    expectedFeeMin: row.expected_fee_min,
    expectedFeeMax: row.expected_fee_max,
    universityName: row.university?.name ?? null,
    subjectNames: row.tutor_subjects
      .map((link) => link.subjects?.name)
      .filter((name): name is string => Boolean(name)),
    isVerified: row.is_verified,
  };
}

/** One page of verified, active tutors — cheapest fee first. */
export async function fetchTutors(
  filters: TutorFilters,
  page: number,
  pageSize = 10,
): Promise<TutorPage> {
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('tutors')
    .select(filters.subjectId ? TUTOR_SELECT_BY_SUBJECT : TUTOR_SELECT)
    .eq('is_verified', true)
    .eq('status', 'active');

  if (filters.subjectId) {
    // Embedded filter — PostgREST requires the embed in select (PGRST108).
    query = query.eq('tutor_subjects.subject_id', filters.subjectId);
  }
  const q = filters.q?.replace(/[,()%]/g, ' ').trim();
  if (q) {
    query = query.or(
      `headline.ilike.%${q}%,location.ilike.%${q}%,bio.ilike.%${q}%`,
    );
  }

  const { data, error } = await query
    .order('expected_fee_min', { ascending: true, nullsFirst: false })
    .order('headline')
    .range(from, from + pageSize - 1);

  if (error) fail('Could not load tutors', error.message);

  const rows = (data ?? []) as unknown as TutorRow[];
  const names = await fetchProfileNames(rows.map((row) => row.id));
  return {
    rows: rows.map((row) => toListItem(row, names.get(row.id) ?? 'Tutor')),
    page,
    hasMore: rows.length === pageSize,
  };
}

/** All subjects for the filter chips (public reference data). */
export async function listSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, created_at, updated_at')
    .order('name');
  if (error) fail('Could not load subjects', error.message);
  return (data ?? []) as Subject[];
}

export type TutorDetail = TutorListItem;

/** Single tutor for the detail screen — same merge, id-scoped. */
export async function getTutor(id: string): Promise<TutorDetail> {
  const { data, error } = await supabase
    .from('tutors')
    .select(TUTOR_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) fail('Could not load this tutor', error.message);
  if (!data) fail('Could not load this tutor', 'Tutor not found');

  const row = data as unknown as TutorRow;
  const names = await fetchProfileNames([row.id]);
  return toListItem(row, names.get(row.id) ?? 'Tutor');
}

/** Creates a request from the signed-in student (RLS pins student_id). */
export async function createTuitionRequest(
  input: TuitionRequestInput,
): Promise<void> {
  const parsed = tuitionRequestSchema.safeParse(input);
  if (!parsed.success) {
    fail('Could not send request', parsed.error.issues[0].message);
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) fail('Could not send request', 'You need to sign in first');

  const { error: insertError } = await supabase.from('tuition_requests').insert({
    student_id: user.id,
    tutor_id: input.tutor_id ?? null,
    subject_id: input.subject_id ?? null,
    message: input.message.trim(),
    preferred_time: input.preferred_time?.trim() || null,
  });
  if (insertError) fail('Could not send request', insertError.message);
}

interface RequestRow {
  id: string;
  status: TuitionRequestRow['status'];
  message: string;
  preferred_time: string | null;
  created_at: string;
  subject: { name: string } | null;
  tutor: { headline: string } | null;
}

/** Requests the current student sent, newest first. */
export async function listMyTuitionRequests(): Promise<TuitionRequestRow[]> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) fail('Could not load requests', 'You need to sign in first');

  const { data, error: selectError } = await supabase
    .from('tuition_requests')
    .select(
      'id, status, message, preferred_time, created_at, ' +
        'subject:subjects(name), tutor:tutors(headline)',
    )
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  if (selectError) fail('Could not load requests', selectError.message);

  return ((data ?? []) as unknown as RequestRow[]).map((row) => ({
    id: row.id,
    status: row.status,
    message: row.message,
    preferredTime: row.preferred_time,
    createdAt: row.created_at,
    subjectName: row.subject?.name ?? null,
    tutorHeadline: row.tutor?.headline ?? null,
  }));
}
