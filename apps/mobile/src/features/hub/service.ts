import type {
  BookFilters,
  BookListingDetail,
  BookListingInput,
  BookListingSummary,
  BookPage,
  HubCategory,
  HubFacet,
  HubFilters,
  HubListingDetail,
  HubListingSubmission,
  HubListingSummary,
  HubOffer,
  HubPage,
  ResearchFilters,
  ResearchPage,
  ResearchProfileDetail,
  ResearchProfileSummary,
  ResearchRequest,
  SavedHubListing,
} from '@kse/types';

import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKETS } from '@kse/shared';

import { sanitizeSearchQuery, toPrefixTsQuery } from '@/features/opportunities/service';

/**
 * Student Hub mobile service.
 *
 * Split by trust model:
 *   - Public directory reads (categories, listings, offers) — anon key + RLS,
 *     only published/active rows come back.
 *   - Owner-scoped student content (book listings, research profile,
 *     favorites) — direct client writes, RLS enforces ownership.
 *   - Notification-bearing writes (submit listing, research requests,
 *     book contact) — the `hub-actions` Edge Function (service role inserts
 *     the notifications).
 */

const BUCKET = STORAGE_BUCKETS.studentHub ?? 'student-hub';

const HUB_LIST_SELECT =
  'id, category_id, name, service_type, summary, verified, area, city, ' +
  'latitude, longitude, opening_hours, opens_at, closes_at, price_note, price_type, ' +
  'image_url, has_student_discount, updated_at';

const HUB_DETAIL_SELECT =
  HUB_LIST_SELECT +
  ', description, address, district, phone, whatsapp, email, ' +
  'services, image_urls, last_verified_at, published_at, status, ' +
  'category:student_hub_categories(slug, name)';

const BOOK_LIST_SELECT =
  'id, title, author, subject, edition, condition, intent, price, image_urls, ' +
  'status, updated_at, owner_id, owner:profiles!student_book_listings_owner_id_fkey(full_name, avatar_url)';

const RESEARCH_LIST_SELECT =
  'id, user_id, research_interest, discipline, topic, skills, collaboration_type, ' +
  'institution, district, availability, bio, status, updated_at, ' +
  'profile:profiles!research_profiles_user_id_fkey(full_name, avatar_url)';

class HubError extends Error {}

function fail(context: string, message: string): never {
  throw new HubError(`${context}: ${message}`);
}

export { fail as failHub, HubError };

// ── Categories ───────────────────────────────────────────────────────────────

export async function fetchHubCategories(): Promise<HubCategory[]> {
  const { data, error } = await supabase
    .from('student_hub_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) fail('Could not load Student Hub categories', error.message);
  return (data ?? []) as unknown as HubCategory[];
}

// ── Directory listings ───────────────────────────────────────────────────────

/**
 * Resolves a category slug to its id (PostgREST filters take plain values,
 * not subqueries). Returns null for unknown slugs → callers treat as empty.
 */
async function resolveCategoryId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('student_hub_categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return data?.id ?? null;
}

export async function fetchHubListings(
  filters: HubFilters,
  page: number,
  pageSize = 10,
): Promise<HubPage> {
  const from = (page - 1) * pageSize;
  let categoryId: string | null = null;
  if (filters.categorySlug) {
    categoryId = await resolveCategoryId(filters.categorySlug);
    if (!categoryId) return { rows: [], page, hasMore: false };
  }

  let query = supabase
    .from('student_hub_listings')
    .select(HUB_LIST_SELECT)
    .eq('status', 'published');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (filters.serviceType) {
    query = query.eq('service_type', filters.serviceType);
  }
  if (filters.area) {
    query = query.ilike('area', filters.area.trim());
  }
  if (filters.verified != null) {
    query = query.eq('verified', filters.verified);
  }
  if (filters.discount != null) {
    query = query.eq('has_student_discount', filters.discount);
  }
  if (filters.openNow) {
    query = query.not('opens_at', 'is', null).not('closes_at', 'is', null);
  }
  const tsQuery = filters.q ? toPrefixTsQuery(filters.q) : '';
  if (tsQuery) {
    query = query.filter('search_vector', 'fts(simple)', tsQuery);
  }

  const sort = filters.sort ?? 'recent';
  if (sort === 'verified') {
    query = query.order('verified', { ascending: false });
  } else if (sort === 'discount') {
    query = query.order('has_student_discount', { ascending: false });
  }

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) fail('Could not load listings', error.message);

  const rows = (data ?? []) as unknown as HubListingSummary[];
  const visible = filters.openNow ? rows.filter(isOpenNow) : rows;
  return { rows: visible, page, hasMore: rows.length === pageSize };
}

/** Local-time "open now" check against the structured hours columns. */
export function isOpenNow(listing: {
  opens_at: string | null;
  closes_at: string | null;
}): boolean {
  if (!listing.opens_at || !listing.closes_at) return false;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = listing.opens_at.split(':').map(Number);
  const [ch, cm] = listing.closes_at.split(':').map(Number);
  return minutes >= oh * 60 + om && minutes <= ch * 60 + cm;
}

export async function getHubListing(id: string): Promise<HubListingDetail> {
  const [listingRes, offersRes] = await Promise.all([
    supabase.from('student_hub_listings').select(HUB_DETAIL_SELECT).eq('id', id).maybeSingle(),
    supabase
      .from('student_hub_offers')
      .select('*')
      .eq('listing_id', id)
      .eq('is_active', true)
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10))
      .order('created_at', { ascending: false }),
  ]);
  if (listingRes.error) fail('Could not load this listing', listingRes.error.message);
  if (!listingRes.data) fail('Could not load this listing', 'Listing not found');
  if (offersRes.error) fail('Could not load offers', offersRes.error.message);

  return {
    ...(listingRes.data as unknown as HubListingDetail),
    offers: (offersRes.data ?? []) as unknown as HubOffer[],
  };
}

export async function listHubFacets(categorySlug?: string): Promise<HubFacet> {
  let query = supabase
    .from('student_hub_listings')
    .select('area')
    .eq('status', 'published')
    .not('area', 'is', null);
  if (categorySlug) {
    const categoryId = await resolveCategoryId(categorySlug);
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
  }
  const { data, error } = await query;
  if (error) fail('Could not load areas', error.message);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { area: string | null }[]) {
    if (!row.area) continue;
    counts.set(row.area, (counts.get(row.area) ?? 0) + 1);
  }
  return {
    areas: Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
      .slice(0, 12),
  };
}

// ── Favorites ────────────────────────────────────────────────────────────────

export async function listFavoriteIds(): Promise<Set<string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return new Set();

  const { data, error } = await supabase
    .from('student_hub_favorites')
    .select('listing_id');
  if (error) fail('Could not load your saved places', error.message);
  return new Set(((data ?? []) as { listing_id: string }[]).map((r) => r.listing_id));
}

export async function saveFavorite(listingId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new HubError('You must be signed in');

  const { error } = await supabase
    .from('student_hub_favorites')
    .upsert(
      { user_id: session.user.id, listing_id: listingId },
      { onConflict: 'user_id,listing_id', ignoreDuplicates: true },
    );
  if (error) fail('Could not save', error.message);
}

export async function unsaveFavorite(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('student_hub_favorites')
    .delete()
    .eq('listing_id', listingId);
  if (error) fail('Could not unsave', error.message);
}

export async function listSavedHubListings(): Promise<SavedHubListing[]> {
  const { data, error } = await supabase
    .from('student_hub_favorites')
    .select(`saved_at, listing:student_hub_listings!inner(${HUB_LIST_SELECT})`)
    .eq('listing.status', 'published')
    .order('saved_at', { ascending: false });
  if (error) fail('Could not load saved places', error.message);
  return ((data ?? []) as unknown as { saved_at: string; listing: HubListingSummary }[]).map(
    (r) => ({ ...r.listing, saved_at: r.saved_at }),
  );
}

// ── Reports (central reports table, insert-own RLS) ──────────────────────────

export async function reportHubTarget(
  targetType: 'student_hub_listing' | 'book_listing' | 'research_profile',
  targetId: string,
  reason: string,
  details?: string,
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details?.trim() || null,
  });
  if (error) {
    if (error.code === '23505') {
      throw new HubError('You already reported this — it is being reviewed.');
    }
    fail('Could not submit report', error.message);
  }
}

// ── Edge Function calls ──────────────────────────────────────────────────────

async function callHubAction<T>(
  action: string,
  payload: object,
): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new HubError('You must be signed in');

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new HubError('Supabase URL not configured');

  const res = await fetch(`${baseUrl}/functions/v1/hub-actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({ action, payload }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { message: string };
  };
  if (!res.ok) {
    throw new HubError(body.error?.message ?? `Request failed (${res.status})`);
  }
  if (body.error) throw new HubError(body.error.message);
  return body.data as T;
}

export async function submitHubListing(
  payload: HubListingSubmission,
): Promise<{ id: string }> {
  return callHubAction<{ id: string }>('submit_listing', payload);
}

export async function sendResearchRequest(
  toProfileId: string,
  message: string,
): Promise<void> {
  await callHubAction('research_request', { to_profile_id: toProfileId, message });
}

export async function respondResearchRequest(
  requestId: string,
  accept: boolean,
): Promise<void> {
  await callHubAction('respond_research_request', { request_id: requestId, accept });
}

export async function contactBookOwner(
  bookId: string,
  message?: string,
): Promise<void> {
  await callHubAction('book_contact', { book_id: bookId, message: message ?? null });
}

// ── Book Exchange (owner-scoped direct writes) ───────────────────────────────

export async function fetchBookListings(
  filters: BookFilters,
  page: number,
  pageSize = 10,
): Promise<BookPage> {
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('student_book_listings')
    .select(BOOK_LIST_SELECT)
    .in('status', ['active', 'reserved']);

  if (filters.intent) {
    query = query.eq('intent', filters.intent);
  }
  if (filters.condition) {
    query = query.eq('condition', filters.condition);
  }
  const tsQuery = filters.q ? toPrefixTsQuery(filters.q) : '';
  if (tsQuery) {
    query = query.filter('search_vector', 'fts(simple)', tsQuery);
  }

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) fail('Could not load book listings', error.message);

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    ...r,
    owner_name: (r.owner as { full_name?: string } | null)?.full_name ?? null,
  })) as unknown as BookListingSummary[];
  return { rows, page, hasMore: rows.length === pageSize };
}

export async function getBookListing(id: string): Promise<BookListingDetail> {
  const { data, error } = await supabase
    .from('student_book_listings')
    .select(BOOK_LIST_SELECT + ', expected_exchange, description, contact_preference, phone, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) fail('Could not load this book', error.message);
  if (!data) fail('Could not load this book', 'Book listing not found');
  return data as unknown as BookListingDetail;
}

export async function createBookListing(input: BookListingInput): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new HubError('You must be signed in');

  const { data, error } = await supabase
    .from('student_book_listings')
    .insert({
      owner_id: session.user.id,
      title: input.title,
      author: input.author || null,
      subject: input.subject || null,
      edition: input.edition || null,
      condition: input.condition,
      intent: input.intent,
      price: input.intent === 'sell' ? input.price ?? null : null,
      expected_exchange: input.expected_exchange || null,
      description: input.description || null,
      image_urls: input.image_urls ?? [],
      contact_preference: input.contact_preference,
      phone: input.phone || null,
      status: 'active',
    })
    .select('id')
    .single();
  if (error) fail('Could not create the listing', error.message);
  return data.id;
}

export async function updateBookListing(
  id: string,
  input: BookListingInput,
): Promise<void> {
  const { error } = await supabase
    .from('student_book_listings')
    .update({
      title: input.title,
      author: input.author || null,
      subject: input.subject || null,
      edition: input.edition || null,
      condition: input.condition,
      intent: input.intent,
      price: input.intent === 'sell' ? input.price ?? null : null,
      expected_exchange: input.expected_exchange || null,
      description: input.description || null,
      image_urls: input.image_urls ?? [],
      contact_preference: input.contact_preference,
      phone: input.phone || null,
    })
    .eq('id', id);
  if (error) fail('Could not update the listing', error.message);
}

export async function setBookListingStatus(
  id: string,
  status: 'active' | 'reserved' | 'exchanged' | 'sold' | 'removed',
): Promise<void> {
  const { error } = await supabase
    .from('student_book_listings')
    .update({ status })
    .eq('id', id);
  if (error) fail('Could not update the status', error.message);
}

export async function fetchMyBookListings(): Promise<BookListingSummary[]> {
  const { data, error } = await supabase
    .from('student_book_listings')
    .select(BOOK_LIST_SELECT)
    .order('updated_at', { ascending: false });
  if (error) fail('Could not load your books', error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    ...r,
    owner_name: (r.owner as { full_name?: string } | null)?.full_name ?? null,
  })) as unknown as BookListingSummary[];
}

// ── Research partners ────────────────────────────────────────────────────────

export async function fetchResearchProfiles(
  filters: ResearchFilters,
  page: number,
  pageSize = 10,
): Promise<ResearchPage> {
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('research_profiles')
    .select(RESEARCH_LIST_SELECT)
    .eq('status', 'active');

  if (filters.discipline) {
    query = query.ilike('discipline', `%${filters.discipline}%`);
  }
  if (filters.district) {
    query = query.eq('district', filters.district);
  }
  if (filters.collaboration && filters.collaboration !== 'any') {
    query = query.in('collaboration_type', [filters.collaboration, 'any']);
  }
  const tsQuery = filters.q ? toPrefixTsQuery(filters.q) : '';
  if (tsQuery) {
    query = query.filter('search_vector', 'fts(simple)', tsQuery);
  }

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) fail('Could not load research profiles', error.message);
  return {
    rows: (data ?? []) as unknown as ResearchProfileSummary[],
    page,
    hasMore: (data ?? []).length === pageSize,
  };
}

export async function getResearchProfile(id: string): Promise<ResearchProfileDetail> {
  const { data, error } = await supabase
    .from('research_profiles')
    .select(RESEARCH_LIST_SELECT + ', created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) fail('Could not load this profile', error.message);
  if (!data) fail('Could not load this profile', 'Profile not found');
  return data as unknown as ResearchProfileDetail;
}

export async function getMyResearchProfile(): Promise<ResearchProfileDetail | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('research_profiles')
    .select(RESEARCH_LIST_SELECT + ', created_at')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) fail('Could not load your research profile', error.message);
  return (data as unknown as ResearchProfileDetail) ?? null;
}

export async function saveMyResearchProfile(input: {
  research_interest: string;
  discipline?: string;
  topic?: string;
  skills: string[];
  collaboration_type: 'partner' | 'group' | 'mentorship' | 'any';
  institution?: string;
  district?: string;
  availability?: string;
  bio?: string;
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new HubError('You must be signed in');

  const row = {
    research_interest: input.research_interest,
    discipline: input.discipline || null,
    topic: input.topic || null,
    skills: input.skills,
    collaboration_type: input.collaboration_type,
    institution: input.institution || null,
    district: input.district || null,
    availability: input.availability || null,
    bio: input.bio || null,
  };

  const { data: existing } = await supabase
    .from('research_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('research_profiles').update(row).eq('id', existing.id)
    : await supabase
        .from('research_profiles')
        .insert({ ...row, user_id: session.user.id, status: 'active' });
  if (error) fail('Could not save your research profile', error.message);
}

export async function fetchMyResearchRequests(): Promise<{
  received: ResearchRequest[];
  sent: ResearchRequest[];
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { received: [], sent: [] };

  const fromSel =
    'id, from_user_id, to_profile_id, message, status, created_at, responded_at, ' +
    'from_profile:profiles!research_requests_from_user_id_fkey(full_name, avatar_url)';
  const toSel =
    'id, from_user_id, to_profile_id, message, status, created_at, responded_at, ' +
    'profile:research_profiles!research_requests_to_profile_id_fkey(research_interest)';

  const [receivedRes, sentRes] = await Promise.all([
    supabase
      .from('research_requests')
      .select(`${toSel}, ${fromSel}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('research_requests')
      .select(fromSel)
      .eq('from_user_id', session.user.id)
      .order('created_at', { ascending: false }),
  ]);
  if (receivedRes.error) fail('Could not load your requests', receivedRes.error.message);
  if (sentRes.error) fail('Could not load your requests', sentRes.error.message);

  // Received = requests targeting MY profile (RLS returns only mine anyway;
  // the explicit filter keeps the shape obvious).
  const { data: myProfiles } = await supabase
    .from('research_profiles')
    .select('id')
    .eq('user_id', session.user.id);
  const myProfileIds = new Set(((myProfiles ?? []) as { id: string }[]).map((r) => r.id));
  const received = ((receivedRes.data ?? []) as unknown as ResearchRequest[]).filter((r) =>
    myProfileIds.has(r.to_profile_id),
  );
  return { received, sent: (sentRes.data ?? []) as unknown as ResearchRequest[] };
}

// ── Image upload (storage, own-prefix bucket) ────────────────────────────────

export async function uploadHubImage(localUri: string, mimeType: string): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new HubError('You must be signed in');
  const userId = userData.user.id;

  const response = await fetch(localUri);
  const bytes = await response.arrayBuffer();

  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${userId}/${suffix}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) {
    throw new HubError(`Could not upload image: ${uploadError.message}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!pub.publicUrl) throw new HubError('Upload succeeded but no public URL was returned');
  return pub.publicUrl;
}

// Re-export for callers that don't want to reach into opportunities/service.
export { sanitizeSearchQuery };
