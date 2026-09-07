'use server';

import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Tutor moderation (spec §7 "Tuition Management"). Verification runs through
 * the service-role client: the protect_tutor_columns trigger blocks owners
 * from flipping is_verified, and staff have no direct RLS path either.
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

export interface TuitionActionState {
  error?: string;
}

/** Verify / un-verify a tutor profile (admin quick action). */
export async function setTutorVerified(
  _prev: TuitionActionState,
  formData: FormData,
): Promise<TuitionActionState> {
  const tutorId = String(formData.get('tutorId') ?? '');
  const verified = formData.get('verified') === 'true';

  if (!/^[0-9a-f-]{36}$/i.test(tutorId)) {
    return { error: 'Invalid tutor id.' };
  }

  try {
    await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('tutors')
    .update({ is_verified: verified })
    .eq('id', tutorId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/tuition');
  return {};
}
