'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { communityFormSchema } from '@kse/validation';

/**
 * Community moderation + creation (spec §7 "Community Management"). Toggle a
 * community's status (active / hidden), force-delete a post and create new
 * communities — the communities table has no INSERT policy for anyone, so
 * creation is service-role only, exactly like the other admin writes.
 */

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

export interface CommunityActionState {
  error?: string;
}

export async function setCommunityStatus(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const communityId = String(formData.get('communityId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(communityId)) {
    return { error: 'Invalid community id.' };
  }
  if (!['active', 'hidden', 'removed'].includes(status)) {
    return { error: 'Invalid status.' };
  }

  try {
    await requireStaffUserId();
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
  revalidatePath('/communities');
  return {};
}

export async function deleteCommunityPostAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const postId = String(formData.get('postId') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(postId)) {
    return { error: 'Invalid post id.' };
  }

  try {
    await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('community_posts')
    .delete()
    .eq('id', postId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/communities');
  return {};
}

export interface SaveCommunityState {
  error: string | null;
  fieldErrors: Record<string, string>;
}

/** Create a community (spec §7). slug is unique — a duplicate is reported
 *  as a field error instead of a raw constraint violation. */
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
  const { error } = await admin.from('communities').insert({
    ...parsed.data,
    created_by: staffId,
  });
  if (error) {
    if (error.code === '23505') {
      return {
        error: 'Please fix the highlighted fields.',
        fieldErrors: { slug: 'That slug is already taken.' },
      };
    }
    return { error: `Creating failed: ${error.message}`, fieldErrors: {} };
  }

  revalidatePath('/communities');
  redirect('/communities');
}
