'use server';

import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  setUserRoleSchema,
  setUserStatusSchema,
  setUserVerifiedSchema,
} from '@kse/validation';

/** Verified staff user (session + role read server-side, spec §5/§10). */
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

/**
 * Suspend / reactivate. profiles.is_verified/status are trigger-protected
 * against client writes (protect_profile_columns) — the service role
 * bypasses it, which is exactly the intended admin path.
 */
export async function setUserStatusAction(formData: FormData): Promise<void> {
  const staffId = await requireStaffUserId();
  const parsed = setUserStatusSchema.safeParse({
    userId: formData.get('userId'),
    status: formData.get('status'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input.');
  }
  if (parsed.data.userId === staffId) {
    throw new Error('You cannot suspend your own account.');
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.userId);
  if (error) {
    throw new Error(`Status change failed: ${error.message}`);
  }

  revalidatePath('/users');
}

/** Toggle the ✓ verified badge on a profile. */
export async function setUserVerifiedAction(formData: FormData): Promise<void> {
  await requireStaffUserId();
  const parsed = setUserVerifiedSchema.safeParse({
    userId: formData.get('userId'),
    verified: formData.get('verified'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input.');
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ is_verified: parsed.data.verified })
    .eq('id', parsed.data.userId);
  if (error) {
    throw new Error(`Verification change failed: ${error.message}`);
  }

  revalidatePath('/users');
}

/**
 * Grant or revoke a role. user_roles has no client write policy by design —
 * service-role only, with granted_by stamped for the audit trail.
 */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  const staffId = await requireStaffUserId();
  const parsed = setUserRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
    grant: formData.get('grant'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input.');
  }
  if (parsed.data.userId === staffId && !parsed.data.grant) {
    throw new Error('You cannot remove your own role.');
  }

  const admin = createAdminClient();
  const { userId, role, grant } = parsed.data;

  if (grant) {
    const { error } = await admin
      .from('user_roles')
      .upsert(
        { user_id: userId, role, granted_by: staffId },
        { onConflict: 'user_id,role' },
      );
    if (error) {
      throw new Error(`Role update failed: ${error.message}`);
    }
  } else {
    const { error } = await admin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);
    if (error) {
      throw new Error(`Role update failed: ${error.message}`);
    }
  }

  revalidatePath('/users');
}
