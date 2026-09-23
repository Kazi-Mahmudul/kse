'use server';

import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { getSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * Community management actions (spec §7 + community redesign).
 *
 * Privileged mutations now route through the `community-actions` Edge Function
 * using the staff user's own JWT — the function gates by
 * app_metadata.is_admin and writes audit rows. Direct service-role writes
 * are gone for community mutations; the admin client keeps being used for
 * read-only queries.
 *
 * The /communities/new (admin "create community") bypass was removed in
 * spec compliance — admins approve student requests, they don't author them.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireStaffUserId(): Promise<{ id: string; token: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Not signed in.');
  const token = data.session.access_token;
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) throw new Error('Not signed in.');
  const { data: roles } = await supabase.from('user_roles').select('role');
  if (!isStaff((roles ?? []).map((row) => row.role as string))) {
    throw new Error('Staff access required.');
  }
  return { id: userData.user.id, token };
}

/** Call the community-actions Edge Function with the staff user's JWT. */
async function callCommunityAction(
  token: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<{ data: unknown }> {
  const { url } = getSupabaseEnv();
  const res = await fetch(`${url}/functions/v1/community-actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });
  const body = (await res.json().catch(() => null)) as
    | { error?: string; data?: unknown }
    | null;
  if (!res.ok) {
    throw new Error(body?.error ?? `Edge function returned ${res.status}`);
  }
  return { data: body?.data };
}

export interface CommunityActionState {
  error?: string;
}

// ── Community status ─────────────────────────────────────────────────────────

const COMMUNITY_STATUSES = ['active', 'hidden', 'removed', 'archived'] as const;

export async function setCommunityStatus(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const communityId = String(formData.get('communityId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!UUID_RE.test(communityId)) return { error: 'Invalid community id.' };
  if (!COMMUNITY_STATUSES.includes(status as (typeof COMMUNITY_STATUSES)[number])) {
    return { error: 'Invalid status.' };
  }

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  try {
    await callCommunityAction(session.token, 'admin:set_community_status', {
      community_id: communityId,
      status,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Update failed.' };
  }
  revalidatePath('/communities');
  revalidatePath(`/communities/${communityId}`);
  return {};
}

// ── Soft-remove + restore content ─────────────────────────────────────────────

export async function removeCommunityContentAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const contentType = String(formData.get('contentType') ?? '');
  const contentId = String(formData.get('contentId') ?? '');
  if (
    !['community_post', 'community_comment', 'community_event'].includes(contentType) ||
    !UUID_RE.test(contentId)
  ) {
    return { error: 'Invalid content reference.' };
  }

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  // Service-role update is the simplest path for remove (the Edge Function's
  // restore_content op reverses it). The audit row is written from here so
  // we don't need to add a separate admin op just for remove.
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const table =
    contentType === 'community_post'
      ? 'community_posts'
      : contentType === 'community_comment'
        ? 'community_comments'
        : 'community_events';
  const { error } = await admin.from(table).update({ status: 'removed' }).eq('id', contentId);
  if (error) return { error: error.message };
  await admin.from('audit_logs').insert({
    actor_id: session.id,
    action: 'content.remove',
    entity_type: contentType,
    entity_id: contentId,
  });
  revalidatePath('/communities');
  return {};
}

export async function restoreCommunityContentAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const contentType = String(formData.get('contentType') ?? '');
  const contentId = String(formData.get('contentId') ?? '');
  if (
    !['community_post', 'community_comment', 'community_event'].includes(contentType) ||
    !UUID_RE.test(contentId)
  ) {
    return { error: 'Invalid content reference.' };
  }

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  try {
    await callCommunityAction(session.token, 'admin:restore_content', {
      target_type: contentType,
      target_id: contentId,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Restore failed.' };
  }
  revalidatePath('/communities/moderation');
  return {};
}

/** Hard-delete (only used by admins from the moderation queue's delete button). */
export async function deleteCommunityPostAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const postId = String(formData.get('postId') ?? '');
  if (!UUID_RE.test(postId)) return { error: 'Invalid post id.' };

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { error } = await admin.from('community_posts').delete().eq('id', postId);
  if (error) return { error: error.message };
  await admin.from('audit_logs').insert({
    actor_id: session.id,
    action: 'content.delete',
    entity_type: 'community_post',
    entity_id: postId,
  });
  revalidatePath('/communities');
  return {};
}

// ── Creation requests: approve (via Edge Function RPC) / reject ──────────────

export async function approveCommunityRequestAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const requestId = String(formData.get('requestId') ?? '');
  if (!UUID_RE.test(requestId)) return { error: 'Invalid request id.' };
  const slug = String(formData.get('slug') ?? '').trim();

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  try {
    await callCommunityAction(session.token, 'admin:approve_community_request', {
      request_id: requestId,
      name: slug, // Edge Function uses its own slugify() helper
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Approval failed.' };
  }

  revalidatePath('/communities/pending');
  revalidatePath('/communities');
  return {};
}

export async function rejectCommunityRequestAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const requestId = String(formData.get('requestId') ?? '');
  const reviewNote = String(formData.get('reviewNote') ?? '').trim();
  if (!UUID_RE.test(requestId)) return { error: 'Invalid request id.' };
  if (reviewNote.length < 3) return { error: 'Add a short rejection reason for the requester.' };

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  try {
    await callCommunityAction(session.token, 'admin:reject_community_request', {
      request_id: requestId,
      review_note: reviewNote.slice(0, 500),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Rejection failed.' };
  }
  revalidatePath('/communities/pending');
  return {};
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function resolveReportAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const reportId = String(formData.get('reportId') ?? '');
  const outcome = String(formData.get('outcome') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  if (!UUID_RE.test(reportId)) return { error: 'Invalid report id.' };
  if (!['resolved', 'dismissed'].includes(outcome)) return { error: 'Invalid outcome.' };

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  try {
    await callCommunityAction(session.token, 'admin:resolve_report', {
      report_id: reportId,
      resolution: outcome,
      ...(note ? { resolution_note: note.slice(0, 1000) } : {}),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Resolve failed.' };
  }

  revalidatePath('/communities/reports');
  revalidatePath('/communities/moderation');
  return {};
}

// ── Members & moderators ─────────────────────────────────────────────────────

/** Promote to moderator / demote to member. Owners are transferred separately. */
export async function setMemberRoleAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const communityId = String(formData.get('communityId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '');
  if (!UUID_RE.test(communityId) || !UUID_RE.test(userId)) {
    return { error: 'Invalid community or user id.' };
  }
  // We model moderator as community_moderators rows; members are plain
  // community_members rows. Demoting removes the moderator row.
  if (role !== 'member' && role !== 'moderator') {
    return { error: 'Role must be member or moderator.' };
  }

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  try {
    if (role === 'moderator') {
      await callCommunityAction(session.token, 'admin:assign_moderator', {
        community_id: communityId,
        user_id: userId,
        scope: 'moderator',
      });
    } else {
      await callCommunityAction(session.token, 'admin:remove_moderator', {
        community_id: communityId,
        user_id: userId,
      });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Role change failed.' };
  }
  revalidatePath(`/communities/${communityId}`);
  revalidatePath('/communities/members');
  return {};
}

export async function removeMemberAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const communityId = String(formData.get('communityId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  if (!UUID_RE.test(communityId) || !UUID_RE.test(userId)) {
    return { error: 'Invalid community or user id.' };
  }

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  try {
    await callCommunityAction(session.token, 'admin:remove_member', {
      community_id: communityId,
      user_id: userId,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Remove failed.' };
  }
  revalidatePath(`/communities/${communityId}`);
  revalidatePath('/communities/members');
  return {};
}

// ── Categories ───────────────────────────────────────────────────────────────

export interface CategoryActionState {
  error?: string;
}

export async function saveCommunityCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const { communityCategoryFormSchema } = await import('@kse/validation');
  const parsed = communityCategoryFormSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    sort_order: formData.get('sort_order') ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid category.' };
  }

  // Categories still go through the admin client — there is no community
  // op for them (they're master data) and the audit row lives next to the
  // insert so the failure mode is visible.
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('community_categories')
    .insert(parsed.data)
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return { error: 'A category with that name or slug already exists.' };
    }
    return { error: error.message };
  }
  await admin.from('audit_logs').insert({
    actor_id: session.id,
    action: 'community_category.create',
    entity_type: 'community_category',
    entity_id: data.id,
  });
  revalidatePath('/communities/categories');
  return {};
}

export async function deleteCommunityCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const categoryId = String(formData.get('categoryId') ?? '');
  if (!UUID_RE.test(categoryId)) return { error: 'Invalid category id.' };

  let session: { id: string; token: string };
  try {
    session = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { error } = await admin.from('community_categories').delete().eq('id', categoryId);
  if (error) return { error: error.message };
  await admin.from('audit_logs').insert({
    actor_id: session.id,
    action: 'community_category.delete',
    entity_type: 'community_category',
    entity_id: categoryId,
  });
  revalidatePath('/communities/categories');
  return {};
}

// ── Removed ──────────────────────────────────────────────────────────────────
// saveCommunityAction (admin "create community" bypass) was removed.
// Spec §Admin says admins approve student requests — they don't author them.
// The /communities/new page is deleted; see the page removal in this PR.
