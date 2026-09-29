// hub-actions — write proxy for the Student Hub feature.
//
// Student actions (caller's JWT + service-role writes, mirrors tolet-actions):
//   - submit_listing          suggest a directory listing → pending_review
//   - research_request        ask someone to be your research partner (+notify)
//   - respond_research_request accept/decline a received request (+notify)
//   - book_contact            contact a book-exchange owner (+notify)
//
// Everything else (book listing CRUD, research profile CRUD, favorites)
// is simple owner-scoped CRUD and goes directly through the Supabase
// client with RLS — no Edge Function needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateRule {
  action: string;
  limit: number;
  windowSeconds: number;
}

const RATE_RULES: Record<string, RateRule> = {
  submit_listing: { action: 'hub_submit', limit: 5, windowSeconds: 86_400 },
  research_request: { action: 'hub_research_request', limit: 10, windowSeconds: 86_400 },
  respond_research_request: { action: 'hub_research_respond', limit: 40, windowSeconds: 3600 },
  book_contact: { action: 'hub_book_contact', limit: 20, windowSeconds: 86_400 },
};

const SERVICE_TYPES = new Set([
  'laundry', 'electrician', 'plumber', 'ac_technician', 'fan_repair',
  'repair_other', 'parking', 'bookshop', 'library',
  'restaurant', 'cafe', 'shop', 'other',
]);
const PRICE_TYPES = new Set(['fixed', 'starting_from', 'approximate']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_RE = /^https?:\/\/\S+$/i;
const PHONE_RE = /^[+0-9 ()\-]{6,20}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ok = (data: unknown) => json({ data });

class Bad extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

// ── Rate limiting (Upstash REST, fixed window) ──────────────────────────────

async function checkRateLimit(rule: RateRule, userId: string): Promise<void> {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return; // local dev: no Redis → skip

  const window = Math.floor(Date.now() / 1000 / rule.windowSeconds);
  const key = `kse:rl:${rule.action}:${userId}:${window}`;
  const count = await fetch(`${url}/incr/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json() as Promise<{ result: string | number }>)
    .then((r) => Number(r.result))
    .catch(() => 0);
  if (count === 1) {
    await fetch(`${url}/expire/${key}/${rule.windowSeconds}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  if (count > rule.limit) {
    throw new Bad(`Too many requests. Try again later.`, 429);
  }
}

// ── Payload helpers ─────────────────────────────────────────────────────────

const requireString = (v: unknown, field: string, min: number, max: number): string => {
  if (typeof v !== 'string') throw new Bad(`${field} is required`);
  const s = v.trim();
  if (s.length < min || s.length > max) {
    throw new Bad(`${field} must be ${min}-${max} characters`);
  }
  return s;
};

const optionalString = (v: unknown, field: string, max: number): string | null => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') throw new Bad(`${field} must be a string`);
  const s = v.trim();
  if (s.length > max) throw new Bad(`${field} must be at most ${max} characters`);
  return s.length === 0 ? null : s;
};

const requiredUuid = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new Bad(`${field} must be a valid id`);
  return v;
};

function optionalStringArray(v: unknown, field: string, max: number, itemMax: number): string[] {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new Bad(`${field} must be an array`);
  if (v.length > max) throw new Bad(`${field}: up to ${max} entries`);
  return v.map((item) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Bad(`${field} entries must be non-empty strings`);
    }
    return item.trim().slice(0, itemMax);
  });
}

function optionalUrlArray(v: unknown, field: string, max: number): string[] {
  const urls = optionalStringArray(v, field, max, 2000);
  for (const u of urls) {
    if (!URL_RE.test(u)) throw new Bad(`Each entry in ${field} must be a valid URL`);
  }
  return urls;
}

// ── Auth ────────────────────────────────────────────────────────────────────

async function resolveUser(
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Bad('Not authenticated', 401);
  return data.user.id;
}

async function notify(
  admin: ReturnType<typeof createClient>,
  params: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  await admin.from('notifications').insert({
    user_id: params.user_id,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data ?? {},
  });
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleSubmitListing(
  admin: ReturnType<typeof createClient>,
  userId: string,
  payload: Record<string, unknown>,
) {
  const category_id = requiredUuid(payload.category_id, 'category_id');
  const name = requireString(payload.name, 'name', 3, 120);

  const service_type = String(payload.service_type ?? 'other');
  if (!SERVICE_TYPES.has(service_type)) throw new Bad('Invalid service_type');

  const price_type = payload.price_type == null || payload.price_type === ''
    ? null
    : String(payload.price_type);
  if (price_type && !PRICE_TYPES.has(price_type)) throw new Bad('Invalid price_type');

  const phone = optionalString(payload.phone, 'phone', 20);
  if (phone && !PHONE_RE.test(phone)) throw new Bad('Invalid phone');

  const whatsapp = optionalString(payload.whatsapp, 'whatsapp', 20);
  if (whatsapp && !PHONE_RE.test(whatsapp)) throw new Bad('Invalid whatsapp');

  const { data: category, error: catErr } = await admin
    .from('student_hub_categories')
    .select('id, name')
    .eq('id', category_id)
    .eq('is_active', true)
    .maybeSingle();
  if (catErr) throw new Bad('Could not verify the category', 500);
  if (!category) throw new Bad('Category not found');

  const image_urls = optionalUrlArray(payload.image_urls, 'image_urls', 6);
  const services = optionalStringArray(payload.services, 'services', 12, 60);

  const { data, error } = await admin
    .from('student_hub_listings')
    .insert({
      category_id,
      name,
      service_type,
      summary: optionalString(payload.summary, 'summary', 300),
      description: optionalString(payload.description, 'description', 3000),
      address: optionalString(payload.address, 'address', 200),
      area: optionalString(payload.area, 'area', 80),
      city: optionalString(payload.city, 'city', 80) ?? 'Khulna',
      phone,
      whatsapp,
      opening_hours: optionalString(payload.opening_hours, 'opening_hours', 120),
      price_note: optionalString(payload.price_note, 'price_note', 120),
      price_type,
      services,
      image_urls,
      image_url: image_urls[0] ?? null,
      status: 'pending_review',
      source: 'user_submission',
      submitted_by: userId,
    })
    .select('id')
    .single();

  if (error || !data) throw new Bad(`Could not submit listing: ${error?.message ?? 'unknown'}`, 500);
  return { id: data.id };
}

async function handleResearchRequest(
  admin: ReturnType<typeof createClient>,
  userId: string,
  payload: Record<string, unknown>,
) {
  const to_profile_id = requiredUuid(payload.to_profile_id, 'to_profile_id');
  const message = requireString(payload.message, 'message', 10, 1000);

  const { data: profile, error: profErr } = await admin
    .from('research_profiles')
    .select('id, user_id, research_interest')
    .eq('id', to_profile_id)
    .eq('status', 'active')
    .maybeSingle();
  if (profErr) throw new Bad('Could not load the profile', 500);
  if (!profile) throw new Bad('Research profile not found');
  if (profile.user_id === userId) throw new Bad('You cannot contact your own profile');

  const { data: sender } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  const { data: request, error } = await admin
    .from('research_requests')
    .insert({
      from_user_id: userId,
      to_profile_id,
      message,
      status: 'pending',
    })
    .select('id')
    .maybeSingle();

  // Unique-index hit → the student already has a pending request here.
  if (error) {
    if (error.code === '23505') {
      throw new Bad('You already have a pending request for this profile');
    }
    throw new Bad(`Could not send request: ${error.message}`, 500);
  }

  await notify(admin, {
    user_id: profile.user_id,
    type: 'research_request',
    title: 'New research partner request',
    body: `${sender?.full_name ?? 'A student'} is interested in "${profile.research_interest}" and sent you a collaboration request.`,
    data: { request_id: request?.id, profile_id: to_profile_id },
  });

  return { id: request?.id ?? null };
}

async function handleRespondResearchRequest(
  admin: ReturnType<typeof createClient>,
  userId: string,
  payload: Record<string, unknown>,
) {
  const request_id = requiredUuid(payload.request_id, 'request_id');
  const accept = payload.accept === true;

  const { data: request, error: fetchErr } = await admin
    .from('research_requests')
    .select('id, from_user_id, to_profile_id, message')
    .eq('id', request_id)
    .maybeSingle();
  if (fetchErr) throw new Bad('Could not load the request', 500);
  if (!request) throw new Bad('Request not found', 404);

  const { data: profile } = await admin
    .from('research_profiles')
    .select('id, user_id')
    .eq('id', request.to_profile_id)
    .maybeSingle();
  if (!profile || profile.user_id !== userId) {
    throw new Bad('Only the recipient can respond', 403);
  }

  const { error } = await admin
    .from('research_requests')
    .update({
      status: accept ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', request_id)
    .eq('status', 'pending');
  if (error) throw new Bad(`Could not update the request: ${error.message}`, 500);

  await notify(admin, {
    user_id: request.from_user_id,
    type: 'research_request_response',
    title: accept ? 'Research request accepted' : 'Research request declined',
    body: accept
      ? 'Your research collaboration request was accepted. Open Research Partners to continue.'
      : 'Your research collaboration request was declined.',
    data: { request_id, profile_id: request.to_profile_id },
  });

  return { ok: true };
}

async function handleBookContact(
  admin: ReturnType<typeof createClient>,
  userId: string,
  payload: Record<string, unknown>,
) {
  const book_id = requiredUuid(payload.book_id, 'book_id');
  const message = optionalString(payload.message, 'message', 500) ?? 'Interested in your book.';

  const { data: book, error } = await admin
    .from('student_book_listings')
    .select('id, owner_id, title, status')
    .eq('id', book_id)
    .maybeSingle();
  if (error) throw new Bad('Could not load the book listing', 500);
  if (!book || book.status !== 'active') throw new Bad('Book listing not found', 404);
  if (book.owner_id === userId) throw new Bad('This is your own listing');

  const { data: sender } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  await notify(admin, {
    user_id: book.owner_id,
    type: 'book_contact',
    title: 'Book exchange enquiry',
    body: `${sender?.full_name ?? 'A student'} is interested in "${book.title}": ${message}`,
    data: { book_id },
  });

  return { ok: true };
}

// ── Entry ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Length': '0' },
    });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const userId = await resolveUser(userClient);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json().catch(() => null);
    const action = String((body as { action?: unknown })?.action ?? '');
    const payload = ((body as { payload?: unknown })?.payload ?? {}) as Record<string, unknown>;

    const rule = RATE_RULES[action];
    if (!rule) return json({ error: `Unknown action: ${action || '(none)'}` }, 400);
    await checkRateLimit(rule, userId);

    switch (action) {
      case 'submit_listing':
        return ok(await handleSubmitListing(adminClient, userId, payload));
      case 'research_request':
        return ok(await handleResearchRequest(adminClient, userId, payload));
      case 'respond_research_request':
        return ok(
          await handleRespondResearchRequest(adminClient, userId, payload),
        );
      case 'book_contact':
        return ok(await handleBookContact(adminClient, userId, payload));
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    if (e instanceof Bad) return json({ error: { message: e.message } }, e.status);
    console.error('hub-actions error:', e);
    return json({ error: { message: 'Internal server error' } }, 500);
  }
});
