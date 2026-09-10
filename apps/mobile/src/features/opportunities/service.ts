import { supabase } from '@/lib/supabase';
import type {
  DegreeLevel,
  EventType,
  FundingType,
  Opportunity,
  OpportunityInternshipType,
  OpportunityMode,
  OpportunitySummary,
  OpportunityType,
} from '@kse/types';

/**
 * Published-opportunity reads for the mobile app. RLS guarantees only
 * published rows are ever returned through the anon key; the explicit
 * status filter also keeps queries on the partial indexes.
 */

export interface OpportunityPage {
  rows: OpportunitySummary[];
  page: number;
  hasMore: boolean;
}

/** Filter set shared by the search screen and per-type listings. */
export interface OpportunityFilters {
  /** Free-text query → search_vector full-text search. */
  q?: string;
  type?: OpportunityType;
  /** Multi-type filter — used by the Events Hub which shows both `event`
   *  and `workshop` rows (the spec's "Workshop/Seminar/Hackathon" chips
   *  apply across both). When set, takes precedence over `type`. */
  types?: readonly OpportunityType[];
  mode?: OpportunityMode;
  /** Type-scoped category (spec §6: "event type", "internship category", …). */
  categoryId?: string;
  /** Scholarship filters (spec §6). */
  degreeLevel?: DegreeLevel;
  fundingType?: FundingType;
  /** Country equality — used by the Scholarship Hub's "Local" quick chip. */
  country?: string;
  /** Country inequality — used by the Scholarship Hub's "International" quick chip. */
  countryNot?: string;
  /** Free-text facets filtered by exact value (spec §6: location, company). */
  location?: string;
  organization?: string;
  /** Internship-only chip filter (spec 06._internship_hub_kse). */
  internshipType?: OpportunityInternshipType;
  /** Event-only chip filter — All / Workshop / Seminar / Hackathon (spec 08._events_kse). */
  eventType?: EventType;
  /** Only opportunities whose deadline falls within N days (and is ahead). */
  deadlineWithinDays?: number | null;
}

export class OpportunityError extends Error {}

function fail(context: string, message: string): never {
  throw new OpportunityError(`${context}: ${message}`);
}

/** Strips tsquery operators; \p{L} keeps Bangla and English words. */
export function sanitizeSearchQuery(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
}

export const SUMMARY_SELECT =
  'id, type, title, organization_name, summary, image_url, location, opportunity_mode, deadline, featured, verified, stipend_amount, stipend_currency, internship_type, degree_level, funding_type, country, event_type, starts_at';

/** One page of opportunities matching text + filters, soonest deadline first. */
export async function fetchOpportunities(
  filters: OpportunityFilters,
  page: number,
  pageSize = 10,
): Promise<OpportunityPage> {
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('opportunities')
    .select(SUMMARY_SELECT)
    .eq('status', 'published');

  if (filters.types && filters.types.length > 0) {
    query = query.in('type', [...filters.types]);
  } else if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.mode) {
    query = query.eq('opportunity_mode', filters.mode);
  }
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.degreeLevel) {
    query = query.eq('degree_level', filters.degreeLevel);
  }
  if (filters.fundingType) {
    query = query.eq('funding_type', filters.fundingType);
  }
  if (filters.country) {
    query = query.eq('country', filters.country);
  }
  if (filters.countryNot) {
    query = query.neq('country', filters.countryNot);
  }
  if (filters.location) {
    query = query.eq('location', filters.location);
  }
  if (filters.organization) {
    query = query.eq('organization_name', filters.organization);
  }
  if (filters.internshipType) {
    query = query.eq('internship_type', filters.internshipType);
  }
  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  if (filters.deadlineWithinDays) {
    const now = new Date().toISOString();
    const until = new Date(
      Date.now() + filters.deadlineWithinDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    query = query.gte('deadline', now).lte('deadline', until);
  }
  const sanitized = filters.q ? sanitizeSearchQuery(filters.q) : '';
  if (sanitized) {
    // PostgREST v16 parenthesizes the tsquery config (`plfts(simple).q`);
    // postgrest-js textSearch() still emits the old dot form, which silently
    // matches nothing there — so build the operator ourselves.
    query = query.filter('search_vector', 'plfts(simple)', sanitized);
  }

  // Event listings are sorted by start time (upcoming first); other types
  // still sort by `deadline` (scholarship apply-by, internship apply-by, …).
  // For events without `starts_at`, `nullsFirst: false` pushes them to the
  // end so dated events always lead.
  const filterTypes = filters.types ?? (filters.type ? [filters.type] : []);
  const isEventListing =
    filterTypes.length > 0 &&
    filterTypes.every((t) => t === 'event' || t === 'workshop');
  let ordered = query;
  if (isEventListing) {
    ordered = ordered.order('starts_at', { ascending: true, nullsFirst: false });
  }

  const { data, error } = await ordered
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) fail('Could not load opportunities', error.message);
  const rows = (data ?? []) as OpportunitySummary[];
  return { rows, page, hasMore: rows.length === pageSize };
}

export interface OpportunityCategoryInfo {
  id: string;
  name: string;
}

/** Type-scoped categories for the filter chips (public read, spec §6). */
export async function listOpportunityCategories(
  type?: OpportunityType,
): Promise<OpportunityCategoryInfo[]> {
  let query = supabase
    .from('opportunity_categories')
    .select('id, name')
    .order('sort_order');

  if (type) {
    query = query.eq('opportunity_type', type);
  }

  const { data, error } = await query;
  if (error) fail('Could not load categories', error.message);
  return (data ?? []) as OpportunityCategoryInfo[];
}

/** Facet values for a listing's chip rows (spec §6: location, company). */
export interface OpportunityFacets {
  locations: string[];
  organizations: string[];
}

const FACET_MAX = 12;

async function listDistinctValues(
  column: 'location' | 'organization_name',
  type?: OpportunityType,
): Promise<string[]> {
  let query = supabase
    .from('opportunities')
    .select(column)
    .eq('status', 'published')
    .not(column, 'is', null)
    .order(column);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) fail('Could not load filters', error.message);

  const seen = new Set<string>();
  const values: string[] = [];
  for (const row of (data ?? []) as Record<string, string | null>[]) {
    const value = row[column];
    if (!value) continue;
    const key = value.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value.trim());
    if (values.length >= FACET_MAX) break;
  }
  return values.sort((a, b) => a.localeCompare(b));
}

/** Distinct locations + organizations among published listings (step 14). */
export async function listOpportunityFacets(
  type?: OpportunityType,
): Promise<OpportunityFacets> {
  const [locations, organizations] = await Promise.all([
    listDistinctValues('location', type),
    listDistinctValues('organization_name', type),
  ]);
  return { locations, organizations };
}

/** Newest published opportunities across types (home "Latest"). */
export async function listLatestOpportunities(limit = 4): Promise<OpportunitySummary[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(SUMMARY_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) fail('Could not load opportunities', error.message);
  return (data ?? []) as OpportunitySummary[];
}

/** Published-opportunity count grouped by `type`, for dashboard stat cards. */
export type OpportunityCountsByType = Partial<Record<OpportunityType, number>>;

/**
 * Aggregate published-opportunity counts by type. Pulls just the `type`
 * column and reduces in-memory — fine for MVP scale (sub-10k published rows)
 * and avoids an RPC. The published-only filter rides on the same partial
 * index the feed uses.
 */
export async function listOpportunityCountsByType(): Promise<OpportunityCountsByType> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('type')
    .eq('status', 'published');

  if (error) fail('Could not load opportunity counts', error.message);

  return ((data ?? []) as { type: OpportunityType }[]).reduce<OpportunityCountsByType>(
    (acc, row) => {
      acc[row.type] = (acc[row.type] ?? 0) + 1;
      return acc;
    },
    {},
  );
}

export interface OpportunityDetail extends Opportunity {
  tags: string[];
}

export async function getOpportunity(id: string): Promise<OpportunityDetail> {
  const [{ data: opportunity, error }, { data: tagRows, error: tagError }] =
    await Promise.all([
      supabase.from('opportunities').select('*').eq('id', id).single(),
      supabase
        .from('opportunity_tags')
        .select('tags(name)')
        .eq('opportunity_id', id),
    ]);

  if (error) fail('Could not load this opportunity', error.message);
  if (tagError) fail('Could not load this opportunity', tagError.message);

  const tags = ((tagRows ?? []) as unknown as { tags: { name: string } | null }[])
    .map((row) => row.tags?.name)
    .filter((name): name is string => Boolean(name));

  return { ...(opportunity as Opportunity), tags };
}
