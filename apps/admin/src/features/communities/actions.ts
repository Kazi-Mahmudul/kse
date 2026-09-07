'use server';

import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Community moderation (spec §7 "Community Management"). Toggle a community's
 * status (active / hidden) and force-delete a post — staff have no RLS
 * SELECT/DELETE on community_posts, so this runs through the service role.
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
