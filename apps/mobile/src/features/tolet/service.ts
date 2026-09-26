import type {
  Opportunity,
  ToletCounts,
  ToletFacet,
  ToletFilters,
  ToletListing,
  ToletListingStatus,
  ToletListingSummary,
  ToletPage,
} from '@kse/types';

import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKETS } from '@kse/shared';

import { sanitizeSearchQuery, toPrefixTsQuery } from '@/features/opportunities/service';

/**
 * Bachelor To-Let mobile service.
 *
 * Student writes (submit / update / withdraw / mark availability / report) all
 * go through the `tolet-actions` Edge Function. The function applies per-user
 * rate limits and writes via service-role — the mobile client never inserts
 * directly into `opportunities`.
 *
 * Public reads (the hub feed, detail, facets, counts) read through the anon
 * key and rely on RLS to return only `status='published'` rows.
 */

const BUCKET = STORAGE_BUCKETS.toletListings ?? 'tolet-listings';

const TOLET_LIST_SELECT =
  'id, type, title, organization_name, summary, image_url, location, opportunity_mode, ' +
  'deadline, deadline_note, featured, verified, ' +
  'rent_amount, rent_currency, room_type, gender_preference, available_from, bachelor_friendly, ' +
  'utilities_included, listing_status, image_urls, city, area, available_rooms, total_rooms';

export const TOLET_DETAIL_SELECT =
  TOLET_LIST_SELECT +
  ', description, application_url, landlord_phone, whatsapp, contact_email, floor, created_by, created_at, updated_at';

class ToletError extends Error {}

function fail(context: string, message: string): never {
  throw new ToletError(`${context}: ${message}`);
}

export { fail as failTolet };

// ── Reads ────────────────────────────────────────────────────────────────────

export async function fetchToletListings(
  filters: ToletFilters,
  page: number,
  pageSize = 10,
): Promise<ToletPage> {
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('opportunities')
    .select(TOLET_LIST_SELECT)
    .eq('type', 'tolet')
    .eq('status', 'published');

  if (filters.city) {
    query = query.ilike('city', filters.city.trim());
  }
  if (filters.area) {
    query = query.ilike('area', filters.area.trim());
  }
  if (filters.roomType) {
    query = query.eq('room_type', filters.roomType);
  }
  if (filters.gender) {
    query = query.eq('gender_preference', filters.gender);
  }
  if (filters.bachelorFriendly != null) {
    query = query.eq('bachelor_friendly', filters.bachelorFriendly);
  }
  if (filters.listingStatus) {
    query = query.eq('listing_status', filters.listingStatus);
  }
  if (filters.minRent != null) {
    query = query.gte('rent_amount', filters.minRent);
  }
  if (filters.maxRent != null) {
    query = query.lte('rent_amount', filters.maxRent);
  }
  if (filters.maxTotalRooms != null) {
    query = query.lte('total_rooms', filters.maxTotalRooms);
  }
  const tsQuery = filters.q ? toPrefixTsQuery(filters.q) : '';
  if (tsQuery) {
    query = query.filter('search_vector', 'fts(simple)', tsQuery);
  }

  const sort = filters.sort ?? 'recent';
  let ordered = query;
  if (sort === 'rent_asc') {
    ordered = ordered.order('rent_amount', { ascending: true, nullsFirst: false });
  } else if (sort === 'rent_desc') {
    ordered = ordered.order('rent_amount', { ascending: false, nullsFirst: false });
  }
  // Always tie-break with recency.
  ordered = ordered.order('updated_at', { ascending: false });

  const { data, error } = await ordered.range(from, from + pageSize - 1);
  if (error) fail('Could not load Bachelor To-Let listings', error.message);

  const rows = ((data ?? []) as unknown as Opportunity[]).map(
    (row) => ({ ...row, type: 'tolet' as const }) as ToletListingSummary,
  );
  return { rows, page, hasMore: rows.length === pageSize };
}

export async function getToletListing(id: string): Promise<ToletListing> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(TOLET_DETAIL_SELECT)
    .eq('id', id)
    .eq('type', 'tolet')
    .maybeSingle();

  if (error) fail('Could not load this listing', error.message);
  if (!data) fail('Could not load this listing', 'Listing not found');
  return data as unknown as ToletListing;
}

export async function listToletFacets(): Promise<ToletFacet> {
  // City + area are separate queries; counts computed client-side because the
  // partial GIN index doesn't cover aggregates.
  const [cityRes, areaRes] = await Promise.all([
    supabase
      .from('opportunities')
      .select('city')
      .eq('type', 'tolet')
      .eq('status', 'published')
      .not('city', 'is', null),
    supabase
      .from('opportunities')
      .select('area, city')
      .eq('type', 'tolet')
      .eq('status', 'published')
      .not('area', 'is', null),
  ]);
  if (cityRes.error) fail('Could not load cities', cityRes.error.message);
  if (areaRes.error) fail('Could not load areas', areaRes.error.message);

  const tally = <T,>(rows: T[] | null, getKey: (row: T) => string | null) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      const key = getKey(row);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
      .slice(0, 12);
  };

  return {
    cities: tally(cityRes.data as { city: string | null }[] | null, (r) => r.city),
    areas: tally(areaRes.data as { area: string | null }[] | null, (r) => r.area),
  };
}

export async function listToletCounts(): Promise<ToletCounts> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('listing_status, status')
    .eq('type', 'tolet');

  if (error) fail('Could not load Bachelor To-Let counts', error.message);

  const counts: ToletCounts = {
    available: 0,
    almost_full: 0,
    full: 0,
    unavailable: 0,
    total_published: 0,
    total_pending: 0,
  };
  for (const row of (data ?? []) as {
    listing_status: ToletListingStatus | null;
    status: string;
  }[]) {
    if (row.status === 'published' && row.listing_status) {
      counts[row.listing_status] = (counts[row.listing_status] ?? 0) + 1;
      counts.total_published += 1;
    } else if (row.status === 'pending_review') {
      counts.total_pending += 1;
    }
  }
  return counts;
}

// ── Owner reads ──────────────────────────────────────────────────────────────

export async function listOwnListings(): Promise<ToletListingSummary[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(TOLET_LIST_SELECT)
    .eq('type', 'tolet')
    .order('updated_at', { ascending: false });

  if (error) fail('Could not load your listings', error.message);
  return ((data ?? []) as unknown as Opportunity[]).map(
    (row) => ({ ...row, type: 'tolet' as const }) as ToletListingSummary,
  );
}

// ── Edge Function calls ─────────────────────────────────────────────────────

interface EdgeResponse<T> {
  data?: T;
  error?: { message: string };
}

/**
 * Calls the tolet-actions Edge Function. Reads `EXPO_PUBLIC_SUPABASE_URL`
 * implicitly via the Supabase client. Auth header rides on the user's session.
 */
async function callToletAction<T>(
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) {
    throw new ToletError('You must be signed in');
  }

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new ToletError('Supabase URL not configured');
  }

  const res = await fetch(`${baseUrl}/functions/v1/tolet-actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({ action, payload }),
  });
  const body = (await res.json().catch(() => ({}))) as EdgeResponse<T>;
  if (!res.ok) {
    const message = body.error?.message ?? `Request failed (${res.status})`;
    throw new ToletError(message);
  }
  if (body.error) throw new ToletError(body.error.message);
  return body.data as T;
}

export async function submitListing(
  payload: Record<string, unknown>,
): Promise<{ id: string }> {
  return callToletAction<{ id: string }>('submit_listing', payload);
}

export async function updateOwnListing(
  listingId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await callToletAction('update_own_listing', { ...payload, listing_id: listingId });
}

export async function withdrawOwnListing(listingId: string): Promise<void> {
  await callToletAction('withdraw_own_listing', { listing_id: listingId });
}

export async function setListingAvailability(
  listingId: string,
  status: ToletListingStatus,
): Promise<void> {
  await callToletAction('mark_availability', {
    listing_id: listingId,
    listing_status: status,
  });
}

export async function reportToletListing(
  listingId: string,
  reason: string,
  details?: string,
): Promise<void> {
  await callToletAction('report_listing', {
    target_type: 'tolet_listing',
    target_id: listingId,
    reason,
    details: details ?? null,
  });
}

// ── Image upload (storage) ───────────────────────────────────────────────────

/**
 * Uploads an image picked from the device gallery to the `tolet-listings`
 * bucket under `<auth.uid>/<random>`. Returns the public URL for storing on
 * the listing row.
 *
 * Pattern mirrors `apps/mobile/src/features/profile/service.ts` (avatars).
 */
export async function uploadListingImage(
  localUri: string,
  mimeType: string,
): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw new ToletError('You must be signed in');
  }
  const userId = userData.user.id;

  const response = await fetch(localUri);
  const bytes = await response.arrayBuffer();

  const ext = mimeType === 'image/png' ? 'png'
    : mimeType === 'image/webp' ? 'webp'
    : 'jpg';
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${userId}/${suffix}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) {
    throw new ToletError(`Could not upload image: ${uploadError.message}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!pub.publicUrl) {
    throw new ToletError('Upload succeeded but no public URL was returned');
  }
  return pub.publicUrl;
}

/**
 * Removes a previously uploaded listing image. No-op when the URL is empty or
 * not in this bucket.
 */
export async function deleteListingImage(publicUrl: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}

// Re-export for callers that don't want to reach into opportunities/service.
export { sanitizeSearchQuery };
