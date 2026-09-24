'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  opportunityEligibilitySchema,
  uuidField,
} from '@kse/validation';

const REVALIDATE = ['/opportunities'];

/** Verified staff user (session + role read server-side, spec §5/§10). */
async function requireStaffUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  const { data: roles } = await supabase.from('user_roles').select('role');
  if (!isStaff((roles ?? []).map((row) => row.role as string))) {
    throw new Error('Staff access required.');
  }
  return user.id;
}

function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Inline-form action used from the per-row eligibility editor on the
 * opportunity edit page. Throws on validation failure so Next surfaces
 * the message through its error boundary in dev.
 */
export async function saveOpportunityEligibilityAction(formData: FormData): Promise<void> {
  await requireStaffUserId();
  const opportunityId = formData.get('opportunity_id');
  const idParsed = uuidField('Invalid opportunity id').safeParse(opportunityId);
  if (!idParsed.success) {
    throw new Error('Invalid opportunity id.');
  }

  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(opportunityEligibilitySchema.shape)) {
    // `degree_levels` ships as repeated checkboxes — collect all values,
    // everything else is a single form field.
    if (key === 'degree_levels') {
      raw[key] = formData.getAll(key);
    } else {
      raw[key] = formData.get(key);
    }
  }
  const parsed = opportunityEligibilitySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(Object.values(fieldErrorsFrom(parsed.error))[0] ?? 'Invalid form data');
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('opportunity_eligibility')
    .upsert({ opportunity_id: idParsed.data, ...parsed.data });
  if (error) throw new Error(`Save failed: ${error.message}`);
  for (const path of REVALIDATE) revalidatePath(path);
}

export async function deleteOpportunityEligibilityAction(formData: FormData): Promise<void> {
  await requireStaffUserId();
  const opportunityId = formData.get('opportunity_id');
  const idParsed = uuidField('Invalid opportunity id').safeParse(opportunityId);
  if (!idParsed.success) throw new Error('Invalid opportunity id.');
  const admin = createAdminClient();
  const { error } = await admin
    .from('opportunity_eligibility')
    .delete()
    .eq('opportunity_id', idParsed.data);
  if (error) throw new Error(`Delete failed: ${error.message}`);
  for (const path of REVALIDATE) revalidatePath(path);
}
