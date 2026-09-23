// community-actions — rate-limited write proxy for the community system.
//
// Why: posts, comments, reports and creation requests are spam-prone writes
// (CLAUDE.md §12). The mobile app calls this function instead of writing
// directly; the function enforces an Upstash fixed-window limit, then performs
// the write with the *caller's* JWT so RLS still applies. No service role.
//
// Limits (per user):  posts 20/hour · comments 30/hour · reports 10/day ·
// creation requests 3/day. When Upstash env vars are absent (local dev,
// self-hosted) limiting is skipped and the function acts as a plain proxy.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateRule {
  /** Bucket name, also used in the Redis key. */
  action: string;
  limit: number;
  windowSeconds: number;
}

const RATE_RULES: Record<string, RateRule> = {
  create_post: { action: 'post', limit: 20, windowSeconds: 3600 },
  create_comment: { action: 'comment', limit: 30, windowSeconds: 3600 },
  report: { action: 'report', limit: 10, windowSeconds: 86400 },
  create_request: { action: 'request', limit: 3, windowSeconds: 86400 },
};

const POST_TYPES = new Set(['discussion', 'question', 'opportunity', 'announcement', 'poll']);
const REPORT_TARGETS = new Set([
  'community',
  'community_post',
  'community_comment',
  'community_event',
  'community_poll',
]);
const REPORT_REASONS = new Set([
  'spam',
  'harassment',
  'inappropriate_content',
  'scam',
  'misleading_information',
  'other',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_RE = /^https?:\/\/\S+$/i;

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

// ── Rate limiting (Upstash REST, fixed window) ───────────────────────────────

async function checkRateLimit(rule: RateRule, userId: string): Promise<void> {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return; // local dev: no Redis configured → skip

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
    throw new Bad(
      `Too many ${rule.action}s. Try again later.`,
      429,
    );
  }
}

// ── Payload validation (DB CHECKs + RLS remain the real enforcement) ─────────

const requireString = (v: unknown, field: string, min: number, max: number): string => {
  if (typeof v !== 'string') throw new Bad(`${field} is required`);
  const s = v.trim();
  if (s.length < min || s.length > max) {
    throw new Bad(`${field} must be ${min}-${max} characters`);
  }
  return s;
};

const optionalUuid = (v: unknown, field: string): string | null => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new Bad(`${field} must be a valid id`);
  return v;
};

const optionalUrl = (v: unknown, field: string): string | null => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !URL_RE.test(v) || v.length > 2000) {
    throw new Bad(`${field} must be a valid URL`);
  }
  return v;
};

interface PostPayload {
  community_id: string;
  post_type: string;
  content: string;
  image_url?: string | null;
  link_url?: string | null;
  poll?: { options: string[]; closes_at?: string | null; result_visibility?: string };
}

function parsePostPayload(raw: unknown): PostPayload {
  const p = (raw ?? {}) as Record<string, unknown>;
  const community_id = optionalUuid(p.community_id, 'community_id');
  if (!community_id) throw new Bad('community_id is required');
  const post_type = typeof p.post_type === 'string' ? p.post_type : 'discussion';
  if (!POST_TYPES.has(post_type)) throw new Bad('Invalid post type');
  const content = requireString(p.content, 'content', 1, 2000);

  const payload: PostPayload = {
    community_id,
    post_type,
    content,
    image_url: optionalUrl(p.image_url, 'image_url'),
    link_url: optionalUrl(p.link_url, 'link_url'),
  };

  if (post_type === 'poll') {
    const poll = (p.poll ?? {}) as Record<string, unknown>;
    const options = Array.isArray(poll.options) ? poll.options : [];
    if (options.length < 2 || options.length > 6) {
      throw new Bad('A poll needs 2-6 options');
    }
    const cleanOptions = options.map((o, i) =>
      requireString(o, `Option ${i + 1}`, 1, 120),
    );
    if (new Set(cleanOptions.map((o) => o.toLowerCase())).size !== cleanOptions.length) {
      throw new Bad('Poll options must be unique');
    }
    const visibility = typeof poll.result_visibility === 'string'
      ? poll.result_visibility
      : 'after_close';
    if (!['realtime', 'after_vote', 'after_close'].includes(visibility)) {
      throw new Bad('Invalid poll result visibility');
    }
    const closes_at = poll.closes_at ? new Date(String(poll.closes_at)) : null;
    if (closes_at && Number.isNaN(closes_at.getTime())) throw new Bad('Invalid poll closing time');
    if (closes_at && closes_at.getTime() <= Date.now()) {
      throw new Bad('Poll closing time must be in the future');
    }
    payload.poll = {
      options: cleanOptions,
      closes_at: closes_at ? closes_at.toISOString() : null,
      result_visibility: visibility,
    };
  } else if (p.poll != null) {
    throw new Bad('poll is only allowed for poll posts');
  }
  return payload;
}

function parseCommentPayload(raw: unknown) {
  const p = (raw ?? {}) as Record<string, unknown>;
  const post_id = optionalUuid(p.post_id, 'post_id');
  if (!post_id) throw new Bad('post_id is required');
  return {
    post_id,
    parent_id: optionalUuid(p.parent_id, 'parent_id'),
    content: requireString(p.content, 'content', 1, 1500),
  };
}

function parseReportPayload(raw: unknown) {
  const p = (raw ?? {}) as Record<string, unknown>;
  const target_type = String(p.target_type ?? '');
  if (!REPORT_TARGETS.has(target_type)) throw new Bad('Invalid report target');
  const target_id = optionalUuid(p.target_id, 'target_id');
  if (!target_id) throw new Bad('target_id is required');
  const reason = String(p.reason ?? '');
  if (!REPORT_REASONS.has(reason)) throw new Bad('Invalid report reason');
  const details = p.details == null ? null : requireString(p.details, 'details', 0, 500);
  return { target_type, target_id, reason, details: details || null };
}

function parseRequestPayload(raw: unknown) {
  const p = (raw ?? {}) as Record<string, unknown>;
  const category_id = optionalUuid(p.category_id, 'category_id');
  if (!category_id) throw new Bad('category_id is required');
  const rules = Array.isArray(p.proposed_rules)
    ? p.proposed_rules.map((r: unknown) => requireString(r, 'Rule', 3, 500))
    : [];
  if (rules.length > 8) throw new Bad('Keep it to 8 rules or fewer');
  return {
    name: requireString(p.name, 'name', 3, 80),
    category_id,
    description: requireString(p.description, 'description', 10, 1000),
    purpose: p.purpose == null || p.purpose === ''
      ? null
      : requireString(p.purpose, 'purpose', 10, 500),
    university_id: optionalUuid(p.university_id, 'university_id'),
    department_id: optionalUuid(p.department_id, 'department_id'),
    proposed_rules: rules,
    image_url: optionalUrl(p.image_url, 'image_url'),
  };
}

// ── Actions ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Not authenticated' }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const action = String((body as { action?: unknown })?.action ?? '');
    const payload = (body as { payload?: unknown })?.payload ?? {};

    const rule = RATE_RULES[action];
    if (!rule) return json({ error: `Unknown action: ${action || '(none)'}` }, 400);
    await checkRateLimit(rule, userId);

    switch (action) {
      case 'create_post': {
        const p = parsePostPayload(payload);
        const { data: post, error } = await supabase
          .from('community_posts')
          .insert({
            community_id: p.community_id,
            author_id: userId,
            post_type: p.post_type,
            content: p.content,
            image_url: p.image_url,
            link_url: p.link_url,
          })
          .select('id')
          .single();
        if (error) throw new Bad(error.message, 400);

        if (p.poll) {
          // Sequential inserts (PostgREST has no transactions). Validation
          // above makes option failures unlikely; RLS failures leave a poll
          // post without options, which the app renders as a normal post.
          const { data: poll, error: pollError } = await supabase
            .from('community_polls')
            .insert({
              post_id: post.id,
              closes_at: p.poll.closes_at,
              result_visibility: p.poll.result_visibility,
            })
            .select('id')
            .single();
          if (pollError) throw new Bad(pollError.message, 400);

          const { error: optError } = await supabase.from('community_poll_options').insert(
            p.poll.options.map((option_text, i) => ({
              poll_id: poll.id,
              option_text,
              sort_order: i + 1,
            })),
          );
          if (optError) throw new Bad(optError.message, 400);
        }
        return json({ data: post });
      }

      case 'create_comment': {
        const p = parseCommentPayload(payload);
        const { data, error } = await supabase
          .from('community_comments')
          .insert({
            post_id: p.post_id,
            parent_id: p.parent_id,
            author_id: userId,
            content: p.content,
          })
          .select('id, post_id, parent_id, created_at')
          .single();
        if (error) throw new Bad(error.message, 400);
        return json({ data });
      }

      case 'report': {
        const p = parseReportPayload(payload);
        const { error } = await supabase.from('reports').insert({
          reporter_id: userId,
          target_type: p.target_type,
          target_id: p.target_id,
          reason: p.reason,
          details: p.details,
        });
        if (error) {
          if (error.code === '23505') {
            throw new Bad('You have already reported this content', 409);
          }
          throw new Bad(error.message, 400);
        }
        return json({ data: { ok: true } });
      }

      case 'create_request': {
        const p = parseRequestPayload(payload);
        const { data, error } = await supabase
          .from('community_requests')
          .insert({
            requested_by: userId,
            name: p.name,
            category_id: p.category_id,
            description: p.description,
            purpose: p.purpose,
            university_id: p.university_id,
            department_id: p.department_id,
            proposed_rules: p.proposed_rules,
            image_url: p.image_url,
          })
          .select('id')
          .single();
        if (error) throw new Bad(error.message, 400);
        return json({ data });
      }
    }
  } catch (err) {
    const status = err instanceof Bad ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return json({ error: message }, status);
  }
});
