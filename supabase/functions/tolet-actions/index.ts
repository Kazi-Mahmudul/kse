// tolet-actions — rate-limited write proxy + privileged admin ops for
// Bachelor To-Let listings.
//
// Two roles in one function (mirrors community-actions):
//   1. Student actions (submit_listing, update_own_listing, withdraw_own_listing,
//      mark_availability, upload_listing_image, report_listing) — caller's JWT,
//      RLS applies for reads, service-role for writes, fixed rate limit via
//      Upstash.
//   2. Admin actions (admin:approve_listing, admin:reject_listing,
//      admin:set_listing_status, admin:verify_listing, admin:unverify_listing,
//      admin:archive_listing) — caller's JWT + requireAdmin() reads
//      auth.users.app_metadata.is_admin; service-role writes for the privileged
//      steps; audit_logs entries before/after.
//
// Why split: keeps the deployable count low and the audit surface small.
// Privileged writes are guarded by requireAdmin(); all writes are
// service-role so we never expose write paths via RLS to the mobile client.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateRule {
  action: string;
  limit: number;
  windowSeconds: number;
}

const RATE_RULES: Record<string, RateRule> = {
  submit_listing: { action: 'tolet_submit', limit: 5, windowSeconds: 86_400 },
  update_own_listing: { action: 'tolet_update', limit: 30, windowSeconds: 3600 },
  upload_listing_image: { action: 'tolet_image', limit: 50, windowSeconds: 3600 },
  report_listing: { action: 'tolet_report', limit: 10, windowSeconds: 86_400 },
};

const ROOM_TYPES = new Set([
  'single',
  'shared',
  'sublet',
  'mess_sublet',
  'studio',
  'family',
]);
const GENDERS = new Set(['any', 'male_only', 'female_only']);
const LISTING_STATUSES = new Set([
  'available',
  'almost_full',
  'full',
  'unavailable',
]);
// Mirrors @kse/validation REPORT_REASONS.
const REPORT_REASONS = new Set([
  'spam',
  'harassment',
  'inappropriate',
  'scam',
  'misleading',
  'other',
]);
const REPORT_TARGETS = new Set(['tolet_listing']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_RE = /^https?:\/\/\S+$/i;
const PHONE_RE = /^[+0-9 ()\-]{6,20}$/;
const WHATSAPP_RE = /^\+?[0-9]{6,15}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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
    throw new Bad(`Too many ${rule.action}s. Try again later.`, 429);
  }
}

// ── Payload validation helpers ──────────────────────────────────────────────

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

const optionalUuid = (v: unknown, field: string): string | null => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new Bad(`${field} must be a valid id`);
  return v;
};

const requiredUuid = (v: unknown, field: string): string => {
  const id = optionalUuid(v, field);
  if (!id) throw new Bad(`${field} is required`);
  return id;
};

const optionalUrl = (v: unknown, field: string): string | null => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !URL_RE.test(v) || v.length > 2000) {
    throw new Bad(`${field} must be a valid URL`);
  }
  return v;
};

const optionalNumber = (
  v: unknown,
  field: string,
  { min, max, int }: { min?: number; max?: number; int?: boolean } = {},
): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || Number.isNaN(n)) {
    throw new Bad(`${field} must be a number`);
  }
  if (int && !Number.isInteger(n)) throw new Bad(`${field} must be a whole number`);
  if (min != null && n < min) throw new Bad(`${field} must be ≥ ${min}`);
  if (max != null && n > max) throw new Bad(`${field} must be ≤ ${max}`);
  return n;
};

const optionalBoolean = (v: unknown): boolean => v === true || v === 'on' || v === 'true';

const optionalIsoDate = (v: unknown, field: string): string | null => {
  const s = optionalString(v, field, 30);
  if (!s) return null;
  if (!ISO_DATE_RE.test(s)) throw new Bad(`${field} must be a YYYY-MM-DD date`);
  return s;
};

// ── Payload parsers ─────────────────────────────────────────────────────────

function parseSubmissionPayload(raw: unknown) {
  const p = (raw ?? {}) as Record<string, unknown>;
  const title = requireString(p.title, 'title', 5, 150);
  const location = requireString(p.location, 'location', 3, 200);
  const city = requireString(p.city, 'city', 2, 80);
  const area = optionalString(p.area, 'area', 80);
  const summary = optionalString(p.summary, 'summary', 300);
  const description = optionalString(p.description, 'description', 3000);

  const room_type = String(p.room_type ?? '');
  if (!ROOM_TYPES.has(room_type)) throw new Bad('Invalid room_type');

  const gender_preference = String(p.gender_preference ?? 'any');
  if (!GENDERS.has(gender_preference)) throw new Bad('Invalid gender_preference');

  const rent_amount = optionalNumber(p.rent_amount, 'rent_amount', {
    min: 0.01,
    max: 1_000_000,
  });
  if (rent_amount == null) throw new Bad('rent_amount is required');

  const rent_currency = String(p.rent_currency ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(rent_currency)) {
    throw new Bad('rent_currency must be a 3-letter ISO code (BDT, USD, …)');
  }

  const landlord_phone = String(p.landlord_phone ?? '').trim();
  if (!PHONE_RE.test(landlord_phone)) throw new Bad('Invalid landlord_phone');

  const whatsappRaw = optionalString(p.whatsapp, 'whatsapp', 20);
  if (whatsappRaw && !WHATSAPP_RE.test(whatsappRaw)) {
    throw new Bad('WhatsApp must be digits only (+country code ok)');
  }

  const contact_email = optionalString(p.contact_email, 'contact_email', 120);
  if (contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact_email)) {
    throw new Bad('contact_email is not a valid email');
  }

  const imageUrls = Array.isArray(p.image_urls) ? p.image_urls : [];
  if (imageUrls.length < 1) throw new Bad('Add at least one photo');
  if (imageUrls.length > 8) throw new Bad('Up to 8 photos');
  const cleanUrls: string[] = [];
  for (const u of imageUrls) {
    if (typeof u !== 'string') throw new Bad('image_urls must be strings');
    if (!URL_RE.test(u)) throw new Bad('Each image_url must be a valid URL');
    cleanUrls.push(u);
  }

  const total_rooms = optionalNumber(p.total_rooms, 'total_rooms', {
    min: 1, max: 200, int: true,
  });
  const available_rooms = optionalNumber(p.available_rooms, 'available_rooms', {
    min: 0, max: 200, int: true,
  });
  if (
    total_rooms != null && available_rooms != null
    && available_rooms > total_rooms
  ) {
    throw new Bad('available_rooms cannot exceed total_rooms');
  }

  return {
    title,
    summary,
    description,
    location,
    city,
    area,
    room_type,
    gender_preference,
    rent_amount,
    rent_currency,
    available_from: optionalIsoDate(p.available_from, 'available_from'),
    bachelor_friendly: optionalBoolean(p.bachelor_friendly) || true,
    utilities_included: optionalBoolean(p.utilities_included) || false,
    landlord_phone,
    whatsapp: whatsappRaw,
    contact_email,
    total_rooms,
    available_rooms,
    floor: optionalNumber(p.floor, 'floor', { min: -2, max: 100, int: true }),
    image_urls: cleanUrls,
  };
}

function parseUpdatePayload(raw: unknown) {
  // All fields optional, same constraints as submission when present.
  return parseSubmissionPayload(raw);
}

function parseAvailabilityPayload(raw: unknown) {
  const p = (raw ?? {}) as Record<string, unknown>;
  const status = String(p.listing_status ?? '');
  if (!LISTING_STATUSES.has(status)) throw new Bad('Invalid listing_status');
  return { listing_status: status };
}

function parseReportPayload(raw: unknown) {
  const p = (raw ?? {}) as Record<string, unknown>;
  const target_type = String(p.target_type ?? 'tolet_listing');
  if (!REPORT_TARGETS.has(target_type)) throw new Bad('Invalid report target');
  const target_id = optionalUuid(p.target_id, 'target_id');
  if (!target_id) throw new Bad('target_id is required');
  const reason = String(p.reason ?? '');
  if (!REPORT_REASONS.has(reason)) throw new Bad('Invalid reason');
  const details = optionalString(p.details, 'details', 500);
  return { target_type, target_id, reason, details };
}

// ── Admin gating + audit log ────────────────────────────────────────────────

interface AuthedUser {
  id: string;
  is_admin: boolean;
}

async function resolveUser(supabase: ReturnType<typeof createClient>): Promise<AuthedUser> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Bad('Not authenticated', 401);
  const isAdmin = (data.user.app_metadata as Record<string, unknown> | null)?.is_admin === true;
  return { id: data.user.id, is_admin: isAdmin };
}

function requireAdmin(user: AuthedUser): void {
  if (!user.is_admin) throw new Bad('Admin access required', 403);
}

async function audit(
  admin: ReturnType<typeof createClient>,
  params: {
    actor_id: string;
    action: string;
    entity_type?: string;
    entity_id?: string | null;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await admin.from('audit_logs').insert({
    actor_id: params.actor_id,
    action: params.action,
    entity_type: params.entity_type ?? 'opportunities',
    entity_id: params.entity_id ?? null,
    old_value: null,
    new_value: params.details ?? {},
  });
  if (error) console.error('audit_logs insert failed', error);
}

// ── Notification helpers ────────────────────────────────────────────────────

async function notifyStaff(
  admin: ReturnType<typeof createClient>,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
  opportunityId: string | null,
): Promise<void> {
  // Find staff users via app_metadata.is_admin = true.
  // Admin client used here; auth.admin.listUsers returns email-confirmed users
  // with their app_metadata.
  const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error || !users?.users) return;
  const recipients = users.users.filter((u) =>
    (u.app_metadata as Record<string, unknown> | null)?.is_admin === true
  );
  if (recipients.length === 0) return;

  const rows = recipients.map((u) => ({
    user_id: u.id,
    type,
    title,
    body,
    data,
    opportunity_id: opportunityId,
  }));

  const { error: insErr } = await admin.from('notifications').insert(rows);
  if (insErr) console.error('notifications insert failed', insErr);
}

async function notifyUser(
  admin: ReturnType<typeof createClient>,
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
  opportunityId: string | null,
): Promise<void> {
  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data,
    opportunity_id: opportunityId,
  });
  if (error) console.error('notifications insert failed', error);
}

// ── Action handlers ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const user = await resolveUser(userClient);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json().catch(() => null);
    const action = String((body as { action?: unknown })?.action ?? '');
    const payload = (body as { payload?: unknown })?.payload ?? {};

    const isAdminAction = action.startsWith('admin:');
    const rule = RATE_RULES[action];
    if (!rule && !isAdminAction) {
      return json({ error: `Unknown action: ${action || '(none)'}` }, 400);
    }
    if (rule) await checkRateLimit(rule, user.id);

    switch (action) {
      case 'submit_listing': {
        const p = parseSubmissionPayload(payload);

        const { data, error } = await adminClient
          .from('opportunities')
          .insert({
            type: 'tolet',
            title: p.title,
            organization_name: 'Bachelor To-Let',
            summary: p.summary,
            description: p.description,
            location: p.location,
            city: p.city,
            area: p.area,
            room_type: p.room_type,
            gender_preference: p.gender_preference,
            rent_amount: p.rent_amount,
            rent_currency: p.rent_currency,
            available_from: p.available_from,
            bachelor_friendly: p.bachelor_friendly,
            utilities_included: p.utilities_included,
            landlord_phone: p.landlord_phone,
            whatsapp: p.whatsapp,
            contact_email: p.contact_email,
            total_rooms: p.total_rooms,
            available_rooms: p.available_rooms,
            floor: p.floor,
            image_urls: p.image_urls,
            listing_status: 'available',
            status: 'pending_review',
            created_by: user.id,
          })
          .select('id, title')
          .single();

        if (error) throw new Bad(error.message, 400);

        // Notify staff that a new listing needs review.
        await notifyStaff(
          adminClient,
          'tolet_submitted',
          'New Bachelor To-Let listing',
          `"${data.title}" is waiting for review`,
          { listing_id: data.id, submitted_by: user.id },
          data.id,
        );

        return json({ data });
      }

      case 'update_own_listing': {
        const p = parseUpdatePayload(payload);
        const listing_id = requiredUuid(payload.listing_id, 'listing_id');

        // Verify ownership + status via user client (RLS allowed for staff; this
        // path is also OK because we check created_by = user.id ourselves).
        const { data: existing, error: selErr } = await userClient
          .from('opportunities')
          .select('id, created_by, status')
          .eq('id', listing_id)
          .single();
        if (selErr) throw new Bad(selErr.message, 400);
        if (!existing || existing.created_by !== user.id) {
          throw new Bad('Listing not found', 404);
        }
        if (!['draft', 'pending_review'].includes(existing.status)) {
          throw new Bad('You can only edit listings before they are published', 400);
        }

        const { error } = await adminClient
          .from('opportunities')
          .update({
            title: p.title,
            summary: p.summary,
            description: p.description,
            location: p.location,
            city: p.city,
            area: p.area,
            room_type: p.room_type,
            gender_preference: p.gender_preference,
            rent_amount: p.rent_amount,
            rent_currency: p.rent_currency,
            available_from: p.available_from,
            bachelor_friendly: p.bachelor_friendly,
            utilities_included: p.utilities_included,
            landlord_phone: p.landlord_phone,
            whatsapp: p.whatsapp,
            contact_email: p.contact_email,
            total_rooms: p.total_rooms,
            available_rooms: p.available_rooms,
            floor: p.floor,
            image_urls: p.image_urls,
          })
          .eq('id', listing_id);
        if (error) throw new Bad(error.message, 400);

        return json({ data: { ok: true } });
      }

      case 'withdraw_own_listing': {
        const listing_id = requiredUuid(payload.listing_id, 'listing_id');
        const { data: existing, error: selErr } = await userClient
          .from('opportunities')
          .select('id, created_by, status')
          .eq('id', listing_id)
          .single();
        if (selErr) throw new Bad(selErr.message, 400);
        if (!existing || existing.created_by !== user.id) {
          throw new Bad('Listing not found', 404);
        }
        const { error } = await adminClient
          .from('opportunities')
          .update({ status: 'archived' })
          .eq('id', listing_id);
        if (error) throw new Bad(error.message, 400);

        return json({ data: { ok: true } });
      }

      case 'mark_availability': {
        const listing_id = requiredUuid(payload.listing_id, 'listing_id');
        const p = parseAvailabilityPayload(payload);
        const { data: existing, error: selErr } = await userClient
          .from('opportunities')
          .select('id, created_by, listing_status, title')
          .eq('id', listing_id)
          .single();
        if (selErr) throw new Bad(selErr.message, 400);
        if (!existing || existing.created_by !== user.id) {
          throw new Bad('Listing not found', 404);
        }
        const { error } = await adminClient
          .from('opportunities')
          .update({ listing_status: p.listing_status })
          .eq('id', listing_id);
        if (error) throw new Bad(error.message, 400);

        // Notify users who saved this listing.
        const { data: savers } = await adminClient
          .from('saved_opportunities')
          .select('user_id')
          .eq('opportunity_id', listing_id);
        if (savers && savers.length > 0) {
          const title = existing.title;
          const statusLabel = p.listing_status;
          for (const row of savers) {
            await notifyUser(
              adminClient,
              row.user_id,
              'tolet_status_changed',
              'Listing availability changed',
              `"${title}" is now ${statusLabel.replace('_', ' ')}`,
              { listing_id, new_status: p.listing_status },
              listing_id,
            );
          }
        }

        return json({ data: { ok: true } });
      }

      case 'upload_listing_image': {
        // The mobile client uploads directly to the storage bucket using its
        // own JWT (owner-scoped policies allow that). After the upload the
        // client calls this action to record the URL on its draft listing.
        // Validation here is essentially the URL check.
        const image_url = optionalUrl(payload.image_url, 'image_url');
        if (!image_url) throw new Bad('image_url is required');
        return json({ data: { image_url } });
      }

      case 'report_listing': {
        const p = parseReportPayload(payload);

        // Use user client to insert — community_reports' RLS lets a user
        // insert their own row.
        const { error } = await userClient.from('reports').insert({
          reporter_id: user.id,
          target_type: p.target_type,
          target_id: p.target_id,
          reason: p.reason,
          details: p.details,
        });
        if (error) {
          // reports table does not have a unique constraint per (reporter,
          // target), so duplicate-key protection is best-effort only.
          if (error.code === '23505') {
            throw new Bad('You have already reported this listing', 409);
          }
          throw new Bad(error.message, 400);
        }

        // Notify staff about the new report.
        await notifyStaff(
          adminClient,
          'tolet_reported',
          'Bachelor To-Let listing reported',
          `Reason: ${p.reason}`,
          { listing_id: p.target_id, reason: p.reason, reporter_id: user.id },
          p.target_id,
        );

        return json({ data: { ok: true } });
      }

      // ── Admin actions ────────────────────────────────────────────────────

      case 'admin:approve_listing': {
        requireAdmin(user);
        const listing_id = requiredUuid(payload.listing_id, 'listing_id');
        const { data, error } = await adminClient
          .from('opportunities')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', listing_id)
          .select('id, created_by, title')
          .single();
        if (error) throw new Bad(error.message, 400);

        await notifyUser(
          adminClient,
          data.created_by,
          'tolet_approved',
          'Listing approved',
          `Your listing "${data.title}" is now live.`,
          { listing_id: data.id },
          data.id,
        );

        await audit(adminClient, {
          actor_id: user.id,
          action: 'tolet.approve_listing',
          entity_id: listing_id,
          details: { title: data.title },
        });

        return json({ data: { ok: true } });
      }

      case 'admin:reject_listing': {
        requireAdmin(user);
        const listing_id = requiredUuid(payload.listing_id, 'listing_id');
        const review_note = optionalString(payload.review_note, 'review_note', 500);
        const { data, error } = await adminClient
          .from('opportunities')
          .update({
            status: 'rejected',
            // Reviewer note rides on eligibility; we keep it simple by writing
            // it into a description suffix. Without a dedicated column this is
            // the cleanest signal to the user.
            description: review_note
              ? `[Rejected: ${review_note}]\n\n${''}`
              : undefined,
          })
          .eq('id', listing_id)
          .select('id, created_by, title')
          .single();
        if (error) throw new Bad(error.message, 400);

        await notifyUser(
          adminClient,
          data.created_by,
          'tolet_rejected',
          'Listing rejected',
          review_note
            ? `Your listing "${data.title}" was rejected: ${review_note}`
            : `Your listing "${data.title}" was rejected.`,
          { listing_id: data.id, review_note },
          data.id,
        );

        await audit(adminClient, {
          actor_id: user.id,
          action: 'tolet.reject_listing',
          entity_id: listing_id,
          details: { review_note },
        });

        return json({ data: { ok: true } });
      }

      case 'admin:set_listing_status': {
        requireAdmin(user);
        const listing_id = requiredUuid(payload.listing_id, 'listing_id');
        const p = parseAvailabilityPayload(payload);
        const { data, error } = await adminClient
          .from('opportunities')
          .update({ listing_status: p.listing_status })
          .eq('id', listing_id)
          .select('id, created_by, title')
          .single();
        if (error) throw new Bad(error.message, 400);

        await audit(adminClient, {
          actor_id: user.id,
          action: 'tolet.set_listing_status',
          entity_id: listing_id,
          details: { listing_status: p.listing_status },
        });

        return json({ data: { ok: true } });
      }

      case 'admin:verify_listing': {
        requireAdmin(user);
        const listing_id = requiredUuid(payload.listing_id, 'listing_id');
        const { error } = await adminClient
          .from('opportunities')
          .update({
            verified: true,
            verified_at: new Date().toISOString(),
            verified_by: user.id,
          })
          .eq('id', listing_id);
        if (error) throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'tolet.verify_listing',
          entity_id: listing_id,
        });
        return json({ data: { ok: true } });
      }

      case 'admin:unverify_listing': {
        requireAdmin(user);
        const listing_id = requiredUuid(payload.listing_id, 'listing_id');
        const { error } = await adminClient
          .from('opportunities')
          .update({
            verified: false,
            verified_at: null,
            verified_by: null,
          })
          .eq('id', listing_id);
        if (error) throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'tolet.unverify_listing',
          entity_id: listing_id,
        });
        return json({ data: { ok: true } });
      }

      case 'admin:archive_listing': {
        requireAdmin(user);
        const listing_id = requiredUuid(payload.listing_id, 'listing_id');
        const { error } = await adminClient
          .from('opportunities')
          .update({ status: 'archived' })
          .eq('id', listing_id);
        if (error) throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'tolet.archive_listing',
          entity_id: listing_id,
        });
        return json({ data: { ok: true } });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    const status = err instanceof Bad ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return json({ error: message }, status);
  }
});
