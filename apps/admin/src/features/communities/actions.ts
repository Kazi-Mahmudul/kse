'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  communityCategoryFormSchema,
  communityFormSchema,
} from '@kse/validation';

/**
 * Community management actions (spec §7 + community redesign): CRUD, the
 * creation-request approval flow, report review and moderator management.
 * All writes go through the service-role client after an explicit staff
 * check — communities/user_roles have no client-write policies by design.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireStaffUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not signed in.');
  }
  const { data: roles } = await supabase.from('user_roles').select('role');
  if (!isStaff((roles ?? []).map((row) => row.role as string))) {
    throw new Error('Staff access required.');
  }
  return user.id;
}

/** Every privileged mutation lands in the audit log (spec §7 "Audit Logs"). */
async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from('audit_logs').insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
  });
}

export interface CommunityActionState {
  error?: string;
}

// ── Community status + content ───────────────────────────────────────────────

const COMMUNITY_STATUSES = ['active', 'hidden', 'removed', 'archived'] as const;

export async function setCommunityStatus(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const communityId = String(formData.get('communityId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!UUID_RE.test(communityId)) {
    return { error: 'Invalid community id.' };
  }
  if (!COMMUNITY_STATUSES.includes(status as (typeof COMMUNITY_STATUSES)[number])) {
    return { error: 'Invalid status.' };
  }

  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('communities')
    .update({ status })
    .eq('id', communityId);

  if (error) {
    return { error: error.message };
  }
  await audit(staffId, `community.${status}`, 'community', communityId);
  revalidatePath('/communities');
  revalidatePath(`/communities/${communityId}`);
  return {};
}

/** Soft-remove user content (posts/comments/events keep moderation history). */
export async function removeCommunityContentAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const contentType = String(formData.get('contentType') ?? '');
  const contentId = String(formData.get('contentId') ?? '');
  const table =
    contentType === 'community_post'
      ? 'community_posts'
      : contentType === 'community_comment'
        ? 'community_comments'
        : contentType === 'community_event'
          ? 'community_events'
          : null;
  if (!table || !UUID_RE.test(contentId)) {
    return { error: 'Invalid content reference.' };
  }

  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from(table).update({ status: 'removed' }).eq('id', contentId);
  if (error) {
    return { error: error.message };
  }
  await audit(staffId, 'content.remove', contentType, contentId);
  revalidatePath('/communities');
  return {};
}

/** Restore soft-removed content (moderation undo). */
export async function restoreCommunityContentAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const contentType = String(formData.get('contentType') ?? '');
  const contentId = String(formData.get('contentId') ?? '');
  const table =
    contentType === 'community_post'
      ? 'community_posts'
      : contentType === 'community_comment'
        ? 'community_comments'
        : contentType === 'community_event'
          ? 'community_events'
          : null;
  if (!table || !UUID_RE.test(contentId)) {
    return { error: 'Invalid content reference.' };
  }

  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from(table).update({ status: 'active' }).eq('id', contentId);
  if (error) {
    return { error: error.message };
  }
  await audit(staffId, 'content.restore', contentType, contentId);
  revalidatePath('/communities/moderation');
  return {};
}

export async function deleteCommunityPostAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const postId = String(formData.get('postId') ?? '');
  if (!UUID_RE.test(postId)) {
    return { error: 'Invalid post id.' };
  }

  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('community_posts').delete().eq('id', postId);
  if (error) {
    return { error: error.message };
  }
  await audit(staffId, 'content.delete', 'community_post', postId);
  revalidatePath('/communities');
  return {};
}

// ── Create community (direct admin path) ─────────────────────────────────────

export interface SaveCommunityState {
  error: string | null;
  fieldErrors: Record<string, string>;
}

export async function saveCommunityAction(
  _prev: SaveCommunityState,
  formData: FormData,
): Promise<SaveCommunityState> {
  const staffFailure: SaveCommunityState = {
    error: 'Staff access required.',
    fieldErrors: {},
  };
  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return staffFailure;
  }

  const parsed = communityFormSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    university_id: formData.get('university_id'),
    department_id: formData.get('department_id'),
    category_id: formData.get('category_id'),
    status: formData.get('status'),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Please fix the highlighted fields.', fieldErrors };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('communities')
    .insert({ ...parsed.data, created_by: staffId })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return {
        error: 'Please fix the highlighted fields.',
        fieldErrors: { slug: 'That slug is already taken.' },
      };
    }
    return { error: `Creating failed: ${error.message}`, fieldErrors: {} };
  }
  await audit(staffId, 'community.create', 'community', data.id);

  revalidatePath('/communities');
  redirect('/communities');
}

// ── Creation requests: approve / reject ──────────────────────────────────────

function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Approving creates the public community: category/scope/university carried
 * over, proposed rules inserted, and the requester becomes the owner.
 */
export async function approveCommunityRequestAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const requestId = String(formData.get('requestId') ?? '');
  const slug = slugifyName(String(formData.get('slug') ?? ''));
  const reviewNote = String(formData.get('reviewNote') ?? '').trim() || null;
  if (!UUID_RE.test(requestId)) {
    return { error: 'Invalid request id.' };
  }
  if (slug.length < 3) {
    return { error: 'Slug must be at least 3 characters.' };
  }

  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { data: request, error: requestError } = await admin
    .from('community_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (requestError || !request) {
    return { error: 'Request not found.' };
  }
  if (request.status !== 'pending') {
    return { error: 'This request was already reviewed.' };
  }

  const { data: community, error: communityError } = await admin
    .from('communities')
    .insert({
      name: request.name,
      slug,
      description: request.description,
      cover_image_url: request.image_url,
      university_id: request.university_id,
      department_id: request.department_id,
      category_id: request.category_id,
      created_by: request.requested_by,
      status: 'active',
    })
    .select('id')
    .single();
  if (communityError) {
    if (communityError.code === '23505') {
      return { error: 'That slug is already taken — edit it and retry.' };
    }
    return { error: communityError.message };
  }

  const rules = Array.isArray(request.proposed_rules) ? request.proposed_rules : [];
  if (rules.length > 0) {
    await admin.from('community_rules').insert(
      rules
        .filter((rule): rule is string => typeof rule === 'string' && rule.trim().length >= 3)
        .map((rule, index) => ({
          community_id: community.id,
          content: rule.trim().slice(0, 500),
          sort_order: index + 1,
        })),
    );
  }

  const { error: memberError } = await admin.from('community_members').insert({
    community_id: community.id,
    user_id: request.requested_by,
    role: 'owner',
  });
  if (memberError && memberError.code !== '23505') {
    return { error: memberError.message };
  }

  const { error: updateError } = await admin
    .from('community_requests')
    .update({
      status: 'approved',
      community_id: community.id,
      reviewed_by: staffId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq('id', requestId)
    .eq('status', 'pending');
  if (updateError) {
    return { error: updateError.message };
  }

  await audit(staffId, 'community_request.approve', 'community_request', requestId);
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
  if (!UUID_RE.test(requestId)) {
    return { error: 'Invalid request id.' };
  }
  if (reviewNote.length < 3) {
    return { error: 'Add a short rejection reason for the requester.' };
  }

  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('community_requests')
    .update({
      status: 'rejected',
      reviewed_by: staffId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote.slice(0, 500),
    })
    .eq('id', requestId)
    .eq('status', 'pending');
  if (error) {
    return { error: error.message };
  }

  await audit(staffId, 'community_request.reject', 'community_request', requestId);
  revalidatePath('/communities/pending');
  return {};
}

// ── Reports ──────────────────────────────────────────────────────────────────

/**
 * Resolve (action taken) or dismiss (no action) a report. Optionally
 * soft-removes the reported content in the same action.
 */
export async function resolveReportAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const reportId = String(formData.get('reportId') ?? '');
  const outcome = String(formData.get('outcome') ?? '');
  const removeTarget = formData.get('removeTarget') === 'on';
  const note = String(formData.get('note') ?? '').trim() || null;
  const targetType = String(formData.get('targetType') ?? '');
  const targetId = String(formData.get('targetId') ?? '');
  if (!UUID_RE.test(reportId)) {
    return { error: 'Invalid report id.' };
  }
  if (!['resolved', 'dismissed'].includes(outcome)) {
    return { error: 'Invalid outcome.' };
  }

  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();

  if (removeTarget) {
    if (targetType === 'community_poll') {
      // A poll lives on its post — remove the post (and the poll with it).
      const { data: poll } = await admin
        .from('community_polls')
        .select('post_id')
        .eq('id', targetId)
        .maybeSingle();
      if (poll?.post_id) {
        await admin
          .from('community_posts')
          .update({ status: 'removed' })
          .eq('id', poll.post_id);
      }
    } else {
      const table =
        targetType === 'community_post'
          ? 'community_posts'
          : targetType === 'community_comment'
            ? 'community_comments'
            : targetType === 'community_event'
              ? 'community_events'
              : targetType === 'community'
                ? 'communities'
                : null;
      if (table && UUID_RE.test(targetId)) {
        await admin.from(table).update({ status: 'removed' }).eq('id', targetId);
      }
    }
  }

  const { error } = await admin
    .from('reports')
    .update({
      status: outcome,
      resolved_by: staffId,
      resolution_note: note,
    })
    .eq('id', reportId)
    .in('status', ['open', 'reviewing']);
  if (error) {
    return { error: error.message };
  }

  await audit(staffId, `report.${outcome}`, 'report', reportId);
  revalidatePath('/communities/reports');
  revalidatePath('/communities/moderation');
  return {};
}

// ── Members & moderators ─────────────────────────────────────────────────────

/** Assign or remove the moderator role (owners are managed via transfer). */
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
  if (!['member', 'moderator'].includes(role)) {
    return { error: 'Role must be member or moderator.' };
  }

  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('community_members')
    .update({ role })
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .neq('role', 'owner');
  if (error) {
    return { error: error.message };
  }

  await audit(staffId, `member.role.${role}`, 'community_members', `${communityId}:${userId}`);
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

  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .neq('role', 'owner');
  if (error) {
    return { error: error.message };
  }

  await audit(staffId, 'member.remove', 'community_members', `${communityId}:${userId}`);
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
  let staffId: string;
  try {
    staffId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const parsed = communityCategoryFormSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    sort_order: formData.get('sort_order') ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid category.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('community_categories').insert(parsed.data);
  if (error) {
    if (error.code === '23505') {
      return { error: 'A category with that name or slug already exists.' };
    }
    return { error: error.message };
  }
  void staffId;
  revalidatePath('/communities/categories');
  return {};
}

export async function deleteCommunityCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const categoryId = String(formData.get('categoryId') ?? '');
  if (!UUID_RE.test(categoryId)) {
    return { error: 'Invalid category id.' };
  }
  try {
    await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('community_categories').delete().eq('id', categoryId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath('/communities/categories');
  return {};
}
