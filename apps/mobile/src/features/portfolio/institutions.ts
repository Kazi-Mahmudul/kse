import type {
  EducationInstitution,
  EducationInstitutionRequest,
  EducationInstitutionType,
} from '@kse/types';

import { supabase } from '@/lib/supabase';

/**
 * Education institutions are public reference data — only active rows are
 * visible to anon/authenticated users via the RLS select policy. Writes are
 * staff-only; the mobile app can only submit requests via
 * education_institution_requests.
 *
 * Reads are paginated server-side and support a substring search on the
 * Bangla + English name (trigram + lower(name) ilike).
 */

const COLUMNS = 'id, name, name_bn, type, ownership_type, city, area, is_active';

const PAGE_SIZE = 25;

/** Map an EducationLevel (the Add-Education form's value) to the matching
 *  institution type(s) that picker should narrow to. The first entry is the
 *  primary type; additional entries are shown for levels that legitimately
 *  span more than one (e.g. diploma → polytechnic + technical_school). */
const LEVEL_TO_TYPES: Record<string, readonly EducationInstitutionType[]> = {
  primary_psc: ['school'],
  jsc: ['school'],
  ssc: ['school'],
  hsc: ['college', 'arts_college'],
  diploma: ['polytechnic', 'technical_school'],
  certificate_course: ['university', 'polytechnic', 'technical_school'],
  bachelor: ['university'],
  masters: ['university'],
  mphil: ['university'],
  phd: ['university'],
  other: [
    'university',
    'medical_college',
    'college',
    'school',
    'madrasa',
    'igv_school',
    'technical_school',
    'english_medium',
    'arts_college',
    'polytechnic',
    'military_school',
  ],
};

export function institutionTypesForLevel(level: string | null | undefined): readonly EducationInstitutionType[] {
  if (!level) {
    return LEVEL_TO_TYPES.other ?? [];
  }
  return LEVEL_TO_TYPES[level] ?? LEVEL_TO_TYPES.other ?? [];
}

export interface ListInstitutionsInput {
  types?: readonly EducationInstitutionType[];
  city?: string | null;
  search?: string;
  /** 0-based page offset (page * PAGE_SIZE = .range(from, to)). */
  page?: number;
}

export type ListedInstitution = EducationInstitution;

export async function listInstitutions(
  input: ListInstitutionsInput = {},
): Promise<{ rows: ListedInstitution[]; hasMore: boolean }> {
  const page = Math.max(0, input.page ?? 0);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE; // inclusive upper bound passed to Supabase

  let query = supabase
    .from('education_institutions')
    .select(COLUMNS)
    .eq('is_active', true)
    .order('name')
    .range(from, to);

  if (input.types && input.types.length > 0) {
    query = query.in('type', [...input.types]);
  }
  if (input.city && input.city.trim() !== '') {
    query = query.ilike('city', input.city.trim());
  }
  if (input.search && input.search.trim() !== '') {
    // ilike is case-insensitive substring matching — covered by the trigram
    // index. We OR name_bn for Bangla queries; if a student types
    // "খুলনা" that won't match (no Latin) but typing "khulna" will.
    const term = `%${input.search.trim()}%`;
    query = query.or(`name.ilike.${term},name_bn.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new PortfolioInstitutionError(`Could not load institutions: ${error.message}`);
  }
  const rows = ((data ?? []) as unknown as EducationInstitution[]).slice(0, PAGE_SIZE);
  // Supabase returns up to (to - from + 1) rows; the extra row above tells
  // us there's another page — slice it back down so the consumer only sees
  // exactly PAGE_SIZE rows.
  const hasMore = ((data ?? []).length > PAGE_SIZE);
  return { rows, hasMore };
}

export class PortfolioInstitutionError extends Error {}

/** Submit an institution request from the Add-Education picker when the
 *  student's institution isn't in the directory. RLS enforces that the row
 *  can only be inserted with requested_by = auth.uid() and status = pending. */
export interface SubmitInstitutionRequestInput {
  name: string;
  name_bn?: string | null;
  type: EducationInstitutionType;
  ownership_type?: 'public' | 'private' | 'other' | null;
  city?: string | null;
  area?: string | null;
}

export async function submitInstitutionRequest(
  input: SubmitInstitutionRequestInput,
): Promise<EducationInstitutionRequest> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new PortfolioInstitutionError('You need to sign in first');
  }
  const { data, error } = await supabase
    .from('education_institution_requests')
    .insert({
      requested_by: user.id,
      name: input.name,
      name_bn: input.name_bn ?? null,
      type: input.type,
      ownership_type: input.ownership_type ?? null,
      city: input.city ?? null,
      area: input.area ?? null,
      status: 'pending',
    })
    .select(
      'id, requested_by, name, name_bn, type, ownership_type, city, area, status, reviewed_by, reviewed_at, review_note, created_at, updated_at',
    )
    .single();
  if (error || !data) {
    throw new PortfolioInstitutionError(
      `Could not submit the request: ${error?.message ?? 'unknown error'}`,
    );
  }
  return data as EducationInstitutionRequest;
}
