import { supabase } from '@/lib/supabase';
import type {
  MyTutorApplication,
  Subject,
  TutorListItem,
  TutorReview,
  TuitionRequestRow,
} from '@kse/types';
import {
  tutorApplicationSchema,
  tutorReviewSchema,
  tuitionRequestSchema,
  type TutorApplicationInput,
  type TutorReviewInput,
  type TuitionRequestInput,
} from '@kse/validation';

/**
 * Tuition discovery + request workflow (spec §6, CLAUDE.md §2 "discovery +
 * contact"). RLS shows verified/active tutors only; names come from a
 * profiles merge because tutors↔profiles share no FK (PostgREST cannot embed).
 * Design 10._tuition_finder_kse_2: rating-first cards, subject pills, and a
 * review workflow on the tutor profile.
 */

export class TuitionError extends Error {}

function fail(context: string, message: string): never {
  throw new TuitionError(`${context}: ${message}`);
}

async function requireUserId(context: string): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) fail(context, 'You need to sign in first');
  return user.id;
}

export type TutorSort = 'popular' | 'fee_asc' | 'fee_desc';

export interface TutorFilters {
  /** Free-text query matched against name / headline / location / bio. */
  q?: string;
  /** Exact subject chip selection. */
  subjectId?: string;
  /** Card-list ordering; "popular" (default) is rating-driven per the design. */
  sort?: TutorSort;
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
  rating_avg: number | null;
  rating_count: number | null;
  university: { name: string; short_name: string | null } | null;
  tutor_subjects: { subjects: { name: string } | null }[];
}

const TUTOR_COLUMNS =
  'id, headline, bio, location, availability, expected_fee_min, expected_fee_max, ' +
  'is_verified, rating_avg, rating_count, ' +
  'university:universities(name, short_name)';

/** Subject filtering needs !inner: without it the embedded filter only empties
 *  the child array and every tutor still comes back (left-join semantics). */
const TUTOR_SELECT = `${TUTOR_COLUMNS}, tutor_subjects(subjects(name))`;
const TUTOR_SELECT_BY_SUBJECT = `${TUTOR_COLUMNS}, tutor_subjects!inner(subjects(name))`;

interface ProfileIdentity {
  fullName: string;
  avatarUrl: string | null;
}

async function fetchProfileIdentities(
  ids: string[],
): Promise<Map<string, ProfileIdentity>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', ids);
  if (error) fail('Could not load tutors', error.message);
  const identities = new Map<string, ProfileIdentity>();
  for (const row of (data ?? []) as {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[]) {
    identities.set(row.id, {
      fullName: row.full_name ?? 'Tutor',
      avatarUrl: row.avatar_url,
    });
  }
  return identities;
}

function toListItem(row: TutorRow, identity: ProfileIdentity): TutorListItem {
  return {
    id: row.id,
    fullName: identity.fullName,
    avatarUrl: identity.avatarUrl,
    headline: row.headline,
    bio: row.bio,
    location: row.location,
    availability: row.availability,
    expectedFeeMin: row.expected_fee_min,
    expectedFeeMax: row.expected_fee_max,
    universityName: row.university?.name ?? null,
    universityShortName: row.university?.short_name ?? null,
    subjectNames: row.tutor_subjects
      .map((link) => link.subjects?.name)
      .filter((name): name is string => Boolean(name)),
    isVerified: row.is_verified,
    ratingAvg: row.rating_avg ?? 0,
    ratingCount: row.rating_count ?? 0,
  };
}

/** Tutors whose profile name matches the query — tutors↔profiles share no FK,
 *  so name search resolves ids first and feeds them into the tutor query
 *  (same approach as the admin tuition page). */
async function fetchTutorIdsByName(q: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('full_name', `%${q}%`)
    .limit(50);
  if (error) fail('Could not load tutors', error.message);
  return (data ?? []).map((row) => row.id);
}

function orderFor(sort: TutorSort | undefined) {
  if (sort === 'fee_asc') {
    return [
      { column: 'expected_fee_min', ascending: true, nullsFirst: false },
      { column: 'rating_avg', ascending: false, nullsFirst: false },
    ] as const;
  }
  if (sort === 'fee_desc') {
    return [
      { column: 'expected_fee_min', ascending: false, nullsFirst: false },
      { column: 'rating_avg', ascending: false, nullsFirst: false },
    ] as const;
  }
  // "Popular Tutors" (design): rating first, then review count, then fee.
  return [
    { column: 'rating_avg', ascending: false, nullsFirst: false },
    { column: 'rating_count', ascending: false, nullsFirst: false },
    { column: 'expected_fee_min', ascending: true, nullsFirst: false },
  ] as const;
}

/** One page of verified, active tutors. */
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
    const nameIds = await fetchTutorIdsByName(q);
    query = query.or(
      `headline.ilike.%${q}%,location.ilike.%${q}%,bio.ilike.%${q}%` +
        (nameIds.length > 0 ? `,id.in.(${nameIds.join(',')})` : ''),
    );
  }
  for (const clause of orderFor(filters.sort)) {
    query = query.order(clause.column, {
      ascending: clause.ascending,
      nullsFirst: clause.nullsFirst,
    });
  }

  const { data, error } = await query.range(from, from + pageSize - 1);

  if (error) fail('Could not load tutors', error.message);

  const rows = (data ?? []) as unknown as TutorRow[];
  const identities = await fetchProfileIdentities(rows.map((row) => row.id));
  return {
    rows: rows.map((row) =>
      toListItem(row, identities.get(row.id) ?? { fullName: 'Tutor', avatarUrl: null }),
    ),
    page,
    hasMore: rows.length === pageSize,
  };
}

/** All subjects for the filter pills (public reference data). */
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
/** Live count of verified, active tutors — mirrors the feed's base filters. */
export async function listTutorCount(): Promise<number> {
  const { count, error } = await supabase
    .from('tutors')
    .select('id', { count: 'exact', head: true })
    .eq('is_verified', true)
    .eq('status', 'active');

  if (error) fail('Could not load tutor count', error.message);
  return count ?? 0;
}

export async function getTutor(id: string): Promise<TutorDetail> {
  const { data, error } = await supabase
    .from('tutors')
    .select(TUTOR_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) fail('Could not load this tutor', error.message);
  if (!data) fail('Could not load this tutor', 'Tutor not found');

  const row = data as unknown as TutorRow;
  const identities = await fetchProfileIdentities([row.id]);
  return toListItem(row, identities.get(row.id) ?? { fullName: 'Tutor', avatarUrl: null });
}

// ── Reviews ──────────────────────────────────────────────────────────────────

interface ReviewRow {
  id: string;
  tutor_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

/** Reviews for a tutor profile, newest first (reviewer identity merged). */
export async function listTutorReviews(tutorId: string): Promise<TutorReview[]> {
  const { data, error } = await supabase
    .from('tutor_reviews')
    .select('id, tutor_id, reviewer_id, rating, comment, created_at, updated_at')
    .eq('tutor_id', tutorId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) fail('Could not load reviews', error.message);

  const rows = (data ?? []) as unknown as ReviewRow[];
  const identities = await fetchProfileIdentities(
    rows.map((row) => row.reviewer_id),
  );
  return rows.map((row) => {
    const identity = identities.get(row.reviewer_id);
    return {
      id: row.id,
      tutorId: row.tutor_id,
      reviewerId: row.reviewer_id,
      reviewerName: identity?.fullName ?? 'Student',
      reviewerAvatarUrl: identity?.avatarUrl ?? null,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

/** Creates or updates the signed-in student's review (one per tutor). */
export async function upsertTutorReview(
  tutorId: string,
  input: TutorReviewInput,
): Promise<void> {
  const parsed = tutorReviewSchema.safeParse(input);
  if (!parsed.success) {
    fail('Could not save review', parsed.error.issues[0].message);
  }

  const userId = await requireUserId('Could not save review');
  const { error } = await supabase
    .from('tutor_reviews')
    .upsert(
      {
        tutor_id: tutorId,
        reviewer_id: userId,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      },
      { onConflict: 'tutor_id,reviewer_id' },
    );
  if (error) fail('Could not save review', error.message);
}

/** Reviewer, reviewed tutor, or staff may remove (RLS enforces the same). */
export async function deleteTutorReview(reviewId: string): Promise<void> {
  const { error } = await supabase.from('tutor_reviews').delete().eq('id', reviewId);
  if (error) fail('Could not delete review', error.message);
}

// ── Saved tutors (card bookmark) ─────────────────────────────────────────────

/** Tutor ids the signed-in student bookmarked. */
export async function listSavedTutorIds(): Promise<string[]> {
  const userId = await requireUserId('Could not load saved tutors');
  const { data, error } = await supabase
    .from('saved_tutors')
    .select('tutor_id')
    .eq('user_id', userId);
  if (error) fail('Could not load saved tutors', error.message);
  return (data ?? []).map((row) => row.tutor_id);
}

export async function saveTutor(tutorId: string): Promise<void> {
  const userId = await requireUserId('Could not save tutor');
  const { error } = await supabase
    .from('saved_tutors')
    .upsert({ user_id: userId, tutor_id: tutorId });
  if (error) fail('Could not save tutor', error.message);
}

export async function unsaveTutor(tutorId: string): Promise<void> {
  const userId = await requireUserId('Could not unsave tutor');
  const { error } = await supabase
    .from('saved_tutors')
    .delete()
    .eq('user_id', userId)
    .eq('tutor_id', tutorId);
  if (error) fail('Could not unsave tutor', error.message);
}

// ── Tuition requests ─────────────────────────────────────────────────────────

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

// ── Become-a-tutor applications ──────────────────────────────────────────────

interface ApplicationRow {
  id: string;
  status: MyTutorApplication['status'];
  headline: string;
  bio: string | null;
  university_id: string | null;
  location: string | null;
  expected_fee_min: number | null;
  expected_fee_max: number | null;
  availability: string | null;
  review_note: string | null;
  created_at: string;
  university: { name: string } | null;
  tutor_application_subjects: { subject_id: string; subjects: { name: string } | null }[];
}

/** The student's latest application (their tutor-journey status), or null. */
export async function getMyTutorApplication(): Promise<MyTutorApplication | null> {
  const userId = await requireUserId('Could not load your application');

  const { data, error } = await supabase
    .from('tutor_applications')
    .select(
      'id, status, headline, bio, university_id, location, expected_fee_min, ' +
        'expected_fee_max, availability, review_note, created_at, ' +
        'university:universities(name), ' +
        'tutor_application_subjects(subject_id, subjects(name))',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) fail('Could not load your application', error.message);
  if (!data) return null;

  const row = data as unknown as ApplicationRow;
  return {
    id: row.id,
    status: row.status,
    headline: row.headline,
    bio: row.bio,
    universityId: row.university_id,
    universityName: row.university?.name ?? null,
    location: row.location,
    expectedFeeMin: row.expected_fee_min,
    expectedFeeMax: row.expected_fee_max,
    availability: row.availability,
    subjectIds: row.tutor_application_subjects.map((link) => link.subject_id),
    subjectNames: row.tutor_application_subjects
      .map((link) => link.subjects?.name)
      .filter((name): name is string => Boolean(name)),
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}

/** Submits a new application; staff review it in the admin portal. */
export async function submitTutorApplication(
  input: TutorApplicationInput,
): Promise<void> {
  const parsed = tutorApplicationSchema.safeParse(input);
  if (!parsed.success) {
    fail('Could not submit application', parsed.error.issues[0].message);
  }

  const userId = await requireUserId('Could not submit application');

  const { data: application, error } = await supabase
    .from('tutor_applications')
    .insert({
      user_id: userId,
      headline: parsed.data.headline,
      bio: parsed.data.bio?.trim() || null,
      university_id: parsed.data.university_id ?? null,
      location: parsed.data.location?.trim() || null,
      expected_fee_min: parsed.data.expected_fee_min ?? null,
      expected_fee_max: parsed.data.expected_fee_max ?? null,
      availability: parsed.data.availability?.trim() || null,
    })
    .select('id')
    .single();
  if (error) fail('Could not submit application', error.message);

  const { error: subjectsError } = await supabase
    .from('tutor_application_subjects')
    .insert(
      parsed.data.subject_ids.map((subject_id) => ({
        application_id: application.id,
        subject_id,
      })),
    );
  if (subjectsError) fail('Could not submit application', subjectsError.message);
}
