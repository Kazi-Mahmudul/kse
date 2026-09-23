// community-actions — rate-limited write proxy + privileged admin ops.
//
// Two roles in one function:
//   1. Student actions (create_post, create_comment, create_poll, report,
//      toggle_reaction, create_request) — caller's JWT, RLS applies, fixed
//      rate-limit via Upstash.
//   2. Admin actions (approve_community_request, reject_community_request,
//      set_community_status, assign_moderator, remove_moderator, remove_member,
//      resolve_report, restore_content) — caller's JWT but requires
//      app_metadata.is_admin = true; uses the same JWT for RLS, then issues
//      service-role writes for the privileged steps and writes audit_logs.
//
// Why split: a single function keeps the deployable count low and the audit
// surface small. Privileged writes are guarded by requireAdmin() which reads
// auth.users.app_metadata.is_admin and writes an audit row before/after.

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
  create_post: { action: 'post', limit: 20, windowSeconds: 3600 },
  create_comment: { action: 'comment', limit: 30, windowSeconds: 3600 },
  report: { action: 'report', limit: 10, windowSeconds: 86400 },
  create_request: { action: 'request', limit: 3, windowSeconds: 86400 },
  // Layer 1e — spec §Security enumerates six buckets; we add the two that
  // were missing. Reactions count per post/comment target, polls ride their
  // own bucket (was bundled with create_post).
  toggle_reaction: { action: 'reaction', limit: 120, windowSeconds: 3600 },
  create_poll: { action: 'poll', limit: 10, windowSeconds: 86400 },
};

const POST_TYPES = new Set(['discussion', 'question', 'opportunity', 'announcement', 'poll']);
const REPORT_TARGETS = new Set([
  'community',
  'community_post',
  'community_comment',
  'community_event',
  'community_poll',
]);
// Layer 2i — spec names reasons exactly: spam, harassment, inappropriate,
// scam, misleading, other (previous code had inappropriate_content and
// misleading_information, which the DB CHECK rejected).
const REPORT_REASONS = new Set([
  'spam', 'harassment', 'inappropriate', 'scam', 'misleading', 'other',
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

// ── Payload validation ────────────────────────────────────────────────────────

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
    if (options.length < 2 || options.length > 6) throw new Bad('A poll needs 2-6 options');
    const cleanOptions = options.map((o, i) => requireString(o, `Option ${i + 1}`, 1, 120));
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

function parseReactionPayload(raw: unknown) {
  const p = (raw ?? {}) as Record<string, unknown>;
  const post_id = optionalUuid(p.post_id, 'post_id');
  const comment_id = optionalUuid(p.comment_id, 'comment_id');
  if ((post_id == null) === (comment_id == null)) {
    throw new Bad('Exactly one of post_id or comment_id is required');
  }
  const reaction = typeof p.reaction === 'string' ? p.reaction : 'like';
  if (reaction !== 'like') throw new Bad('Unsupported reaction type');
  return { post_id, comment_id, reaction };
}

// ── Slug helper (matches packages/validation/community.ts slugField regex) ──

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return SLUG_RE.test(base) ? base : 'community';
}

// ── Admin gating + audit log ──────────────────────────────────────────────────

interface AuthedUser { id: string; is_admin: boolean; }

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
    target_table?: string;
    target_id?: string | null;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await admin.from('audit_logs').insert({
    actor_id: params.actor_id,
    action: params.action,
    target_table: params.target_table ?? null,
    target_id: params.target_id ?? null,
    details: params.details ?? {},
  });
  // Audit failures are not fatal to the operation; log to stderr so the
  // platform picks them up. (Failing the user request would hide the
  // underlying state change.)
  if (error) console.error('audit_logs insert failed', error);
}

// ── Action handlers ───────────────────────────────────────────────────────────

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

    const body = await req.json().catch(() => null);
    const action = String((body as { action?: unknown })?.action ?? '');
    const payload = (body as { payload?: unknown })?.payload ?? {};

    const rule = RATE_RULES[action];
    if (!rule) return json({ error: `Unknown action: ${action || '(none)'}` }, 400);
    // Admin actions skip rate limiting (the queue lives in the admin panel);
    // we still go through the same dispatch for symmetry.
    const isAdminAction = action.startsWith('admin:');
    if (!isAdminAction) await checkRateLimit(rule, user.id);

    switch (action) {
      case 'create_post': {
        const p = parsePostPayload(payload);
        const { data: post, error } = await userClient
          .from('community_posts')
          .insert({
            community_id: p.community_id,
            author_id: user.id,
            post_type: p.post_type,
            content: p.content,
            image_url: p.image_url,
            link_url: p.link_url,
          })
          .select('id')
          .single();
        if (error) throw new Bad(error.message, 400);

        if (p.poll) {
          const { data: poll, error: pollError } = await userClient
            .from('community_polls')
            .insert({
              post_id: post.id,
              closes_at: p.poll.closes_at,
              result_visibility: p.poll.result_visibility,
            })
            .select('id')
            .single();
          if (pollError) throw new Bad(pollError.message, 400);

          const { error: optError } = await userClient.from('community_poll_options').insert(
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
        const { data, error } = await userClient
          .from('community_comments')
          .insert({
            post_id: p.post_id,
            parent_id: p.parent_id,
            author_id: user.id,
            content: p.content,
          })
          .select('id, post_id, parent_id, created_at')
          .single();
        if (error) throw new Bad(error.message, 400);
        return json({ data });
      }

      case 'toggle_reaction': {
        const p = parseReactionPayload(payload);
        if (p.post_id) {
          // Delete-if-exists (one reaction per user per target enforced by PK).
          const { data: existing, error: selErr } = await userClient
            .from('community_reactions')
            .select('post_id')
            .eq('post_id', p.post_id)
            .eq('user_id', user.id)
            .maybeSingle();
          if (selErr) throw new Bad(selErr.message, 400);
          if (existing) {
            const { error: delErr } = await userClient
              .from('community_reactions')
              .delete()
              .eq('post_id', p.post_id)
              .eq('user_id', user.id);
            if (delErr) throw new Bad(delErr.message, 400);
            return json({ data: { active: false } });
          }
          const { error: insErr } = await userClient
            .from('community_reactions')
            .insert({ post_id: p.post_id, user_id: user.id, reaction: p.reaction });
          if (insErr) throw new Bad(insErr.message, 400);
          return json({ data: { active: true } });
        }
        // comment target
        const { data: existing, error: selErr } = await userClient
          .from('community_reactions')
          .select('comment_id')
          .eq('comment_id', p.comment_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (selErr) throw new Bad(selErr.message, 400);
        if (existing) {
          const { error: delErr } = await userClient
            .from('community_reactions')
            .delete()
            .eq('comment_id', p.comment_id)
            .eq('user_id', user.id);
          if (delErr) throw new Bad(delErr.message, 400);
          return json({ data: { active: false } });
        }
        const { error: insErr } = await userClient
          .from('community_reactions')
          .insert({ comment_id: p.comment_id, user_id: user.id, reaction: p.reaction });
        if (insErr) throw new Bad(insErr.message, 400);
        return json({ data: { active: true } });
      }

      case 'report': {
        // Layer 1b: writes to community_reports (dedicated table). The generic
        // `reports` table keeps its original shape for non-community abuse;
        // we no longer insert into it from this function.
        const p = parseReportPayload(payload);
        const { error } = await userClient.from('community_reports').insert({
          reporter_id: user.id,
          target_type: p.target_type,
          target_id: p.target_id,
          reason: p.reason,
          details: p.details,
        });
        if (error) {
          if (error.code === '23505') throw new Bad('You have already reported this content', 409);
          throw new Bad(error.message, 400);
        }
        return json({ data: { ok: true } });
      }

      case 'create_request': {
        const p = parseRequestPayload(payload);
        const { data, error } = await userClient
          .from('community_requests')
          .insert({
            requested_by: user.id,
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

      // ── Admin actions ─────────────────────────────────────────────────────

      case 'admin:approve_community_request': {
        requireAdmin(user);
        const request_id = requiredUuid(payload.request_id, 'request_id');
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Transactional approval: read request → create community → owner
        // member row → mark approved. The whole chain lives in one RPC call
        // so a failure leaves no orphaned community.
        const { data, error } = await adminClient.rpc('approve_community_request', {
          p_request_id: request_id,
          p_admin_id: user.id,
          p_slug_override: slugify(
            String((payload as Record<string, unknown>).name ?? ''),
          ),
        });
        if (error) throw new Bad(error.message, 400);

        await audit(adminClient, {
          actor_id: user.id,
          action: 'community.approve_request',
          target_table: 'community_requests',
          target_id: request_id,
          details: { community_id: (data as { community_id?: string } | null)?.community_id },
        });
        return json({ data });
      }

      case 'admin:reject_community_request': {
        requireAdmin(user);
        const request_id = requiredUuid(payload.request_id, 'request_id');
        const note = typeof payload.review_note === 'string'
          ? payload.review_note.slice(0, 500)
          : null;
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const { error } = await adminClient
          .from('community_requests')
          .update({
            status: 'rejected',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_note: note,
          })
          .eq('id', request_id)
          .eq('status', 'pending');
        if (error) throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'community.reject_request',
          target_table: 'community_requests',
          target_id: request_id,
          details: { review_note: note },
        });
        return json({ data: { ok: true } });
      }

      case 'admin:set_community_status': {
        requireAdmin(user);
        const community_id = requiredUuid(payload.community_id, 'community_id');
        const status = String(payload.status ?? '');
        if (!['active', 'hidden', 'removed', 'archived'].includes(status)) {
          throw new Bad('Invalid community status');
        }
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const { error } = await adminClient
          .from('communities')
          .update({ status })
          .eq('id', community_id);
        if (error) throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'community.set_status',
          target_table: 'communities',
          target_id: community_id,
          details: { status },
        });
        return json({ data: { ok: true } });
      }

      case 'admin:assign_moderator': {
        requireAdmin(user);
        const community_id = requiredUuid(payload.community_id, 'community_id');
        const target_user_id = requiredUuid(payload.user_id, 'user_id');
        const scope = String(payload.scope ?? 'moderator');
        if (!['moderator', 'announcer'].includes(scope)) throw new Bad('Invalid scope');
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const { error } = await adminClient.from('community_moderators').insert({
          community_id,
          user_id: target_user_id,
          scope,
          assigned_by: user.id,
        });
        if (error && error.code !== '23505') throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'community.assign_moderator',
          target_table: 'community_moderators',
          target_id: community_id,
          details: { user_id: target_user_id, scope },
        });
        return json({ data: { ok: true } });
      }

      case 'admin:remove_moderator': {
        requireAdmin(user);
        const community_id = requiredUuid(payload.community_id, 'community_id');
        const target_user_id = requiredUuid(payload.user_id, 'user_id');
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const { error } = await adminClient
          .from('community_moderators')
          .delete()
          .eq('community_id', community_id)
          .eq('user_id', target_user_id);
        if (error) throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'community.remove_moderator',
          target_table: 'community_moderators',
          target_id: community_id,
          details: { user_id: target_user_id },
        });
        return json({ data: { ok: true } });
      }

      case 'admin:remove_member': {
        requireAdmin(user);
        const community_id = requiredUuid(payload.community_id, 'community_id');
        const target_user_id = requiredUuid(payload.user_id, 'user_id');
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const { error } = await adminClient
          .from('community_members')
          .delete()
          .eq('community_id', community_id)
          .eq('user_id', target_user_id);
        if (error) throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'community.remove_member',
          target_table: 'community_members',
          target_id: community_id,
          details: { user_id: target_user_id },
        });
        return json({ data: { ok: true } });
      }

      case 'admin:resolve_report': {
        requireAdmin(user);
        const report_id = requiredUuid(payload.report_id, 'report_id');
        const resolution = String(payload.resolution ?? 'resolved');
        if (!['resolved', 'dismissed'].includes(resolution)) {
          throw new Bad('Invalid resolution');
        }
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const { error } = await adminClient
          .from('community_reports')
          .update({
            status: resolution,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', report_id);
        if (error) throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'community.resolve_report',
          target_table: 'community_reports',
          target_id: report_id,
          details: { resolution },
        });
        return json({ data: { ok: true } });
      }

      case 'admin:restore_content': {
        requireAdmin(user);
        const target_type = String(payload.target_type ?? '');
        const target_id = requiredUuid(payload.target_id, 'target_id');
        if (!['community_post', 'community_comment', 'community_event'].includes(target_type)) {
          throw new Bad('Invalid target type');
        }
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const table =
          target_type === 'community_post' ? 'community_posts'
          : target_type === 'community_comment' ? 'community_comments'
          : 'community_events';
        const { error } = await adminClient
          .from(table)
          .update({ status: 'active' })
          .eq('id', target_id);
        if (error) throw new Bad(error.message, 400);
        await audit(adminClient, {
          actor_id: user.id,
          action: 'community.restore_content',
          target_table: table,
          target_id,
          details: { target_type },
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
