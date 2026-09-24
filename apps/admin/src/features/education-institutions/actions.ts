'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  educationInstitutionFormSchema,
  educationInstitutionUpdateSchema,
  idSchema,
} from '@kse/validation';

const REVALIDATE = ['/education-institutions', '/master-data'];

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

function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * State-shaped create action (paired with useActionState in
 * EducationInstitutionCreateForm). Field errors render under each input
 * via the returned `fieldErrors` map.
 */
export interface EducationInstitutionActionState {
  error: string | null;
  fieldErrors: Record<string, string>;
}

export const initialEducationInstitutionActionState: EducationInstitutionActionState = {
  error: null,
  fieldErrors: {},
};

export async function createEducationInstitutionAction(
  _prev: EducationInstitutionActionState,
  formData: FormData,
): Promise<EducationInstitutionActionState> {
  try {
    await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.', fieldErrors: {} };
  }
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(educationInstitutionFormSchema.shape)) {
    raw[key] = formData.get(key);
  }
  const parsed = educationInstitutionFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the highlighted fields.',
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const admin = createAdminClient();
  const { error } = await admin.from('education_institutions').insert(parsed.data);
  if (error) {
    if (error.code === '23505') {
      return { error: 'That institution already exists.', fieldErrors: {} };
    }
    return { error: `Creating failed: ${error.message}`, fieldErrors: {} };
  }
  for (const path of REVALIDATE) revalidatePath(path);
  return { error: null, fieldErrors: {} };
}

/**
 * Inline edit form action — used by the per-row edit form on the listing.
 * Receives `FormData` only (Next 15 inline-form contract); the row id is
 * passed as a hidden `id` field. Throws surface as error boundaries in dev.
 */
export async function updateEducationInstitutionAction(formData: FormData): Promise<void> {
  await requireStaffUserId();
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(educationInstitutionUpdateSchema.shape)) {
    raw[key] = formData.get(key);
  }
  const parsed = educationInstitutionUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      Object.values(fieldErrorsFromZod(parsed.error))[0] ?? 'Invalid form data',
    );
  }
  const { id, ...values } = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin.from('education_institutions').update(values).eq('id', id);
  if (error) {
    if (error.code === '23505') {
      throw new Error('That institution already exists.');
    }
    throw new Error(`Update failed: ${error.message}`);
  }
  for (const path of REVALIDATE) revalidatePath(path);
}

/**
 * Soft delete = flip is_active = false. We never hard-delete an institution
 * because user education rows may already reference it (on delete set null
 * would silently blank the display name).
 */
export async function deactivateEducationInstitutionAction(formData: FormData): Promise<void> {
  await requireStaffUserId();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error('Invalid id.');
  const admin = createAdminClient();
  const { error } = await admin
    .from('education_institutions')
    .update({ is_active: false })
    .eq('id', parsed.data.id);
  if (error) throw new Error(`Deactivate failed: ${error.message}`);
  for (const path of REVALIDATE) revalidatePath(path);
}

export async function reactivateEducationInstitutionAction(formData: FormData): Promise<void> {
  await requireStaffUserId();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error('Invalid id.');
  const admin = createAdminClient();
  const { error } = await admin
    .from('education_institutions')
    .update({ is_active: true })
    .eq('id', parsed.data.id);
  if (error) throw new Error(`Reactivate failed: ${error.message}`);
  for (const path of REVALIDATE) revalidatePath(path);
}

/** Approve a student-submitted institution request: flip status → approved
 *  and (best-effort) create the public education_institutions row so it
 *  shows up in the mobile picker immediately. */
export async function approveEducationInstitutionRequestAction(
  formData: FormData,
): Promise<void> {
  const reviewerId = await requireStaffUserId();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error('Invalid id.');
  const admin = createAdminClient();

  const { data: requestRow, error: fetchError } = await admin
    .from('education_institution_requests')
    .select('id, name, name_bn, type, ownership_type, city, area, status')
    .eq('id', parsed.data.id)
    .maybeSingle();
  if (fetchError || !requestRow) {
    throw new Error('Could not load the request.');
  }
  if (requestRow.status !== 'pending') {
    throw new Error('That request has already been reviewed.');
  }

  // Best-effort insert — if the unique index rejects it (e.g. an admin
  // created the same institution manually in the meantime), we still mark
  // the request approved so the student stops waiting.
  await admin.from('education_institutions').insert({
    name: requestRow.name,
    name_bn: requestRow.name_bn,
    type: requestRow.type,
    ownership_type: requestRow.ownership_type ?? 'other',
    city: requestRow.city,
    area: requestRow.area,
    is_active: true,
  });

  const { error } = await admin
    .from('education_institution_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id);
  if (error) throw new Error(`Approve failed: ${error.message}`);
  for (const path of REVALIDATE) revalidatePath(path);
}

export async function rejectEducationInstitutionRequestAction(
  formData: FormData,
): Promise<void> {
  const reviewerId = await requireStaffUserId();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error('Invalid id.');
  const note = formData.get('review_note');
  const admin = createAdminClient();
  const { error } = await admin
    .from('education_institution_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_note: typeof note === 'string' && note.trim() !== '' ? note.trim() : null,
    })
    .eq('id', parsed.data.id);
  if (error) throw new Error(`Reject failed: ${error.message}`);
  for (const path of REVALIDATE) revalidatePath(path);
}
