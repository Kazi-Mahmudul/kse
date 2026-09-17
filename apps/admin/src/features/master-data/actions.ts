'use server';

import { revalidatePath } from 'next/cache';
import type { ZodObject } from 'zod';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  departmentFormSchema,
  idSchema,
  opportunityCategoryFormSchema,
  skillFormSchema,
  subjectFormSchema,
  tagFormSchema,
  universityFormSchema,
} from '@kse/validation';

import type { MasterDataActionState } from './types';

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

/** Parse + insert a master-data row; shared shape for every entity form. */
async function createRow(
  table: string,
  schema: ZodObject,
  formData: FormData,
  revalidatePaths: string[],
  transform?: (values: Record<string, unknown>) => Record<string, unknown>,
): Promise<MasterDataActionState> {
  try {
    await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.', fieldErrors: {} };
  }

  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(schema.shape)) {
    raw[key] = formData.get(key);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Please fix the highlighted fields.', fieldErrors };
  }

  const values = transform
    ? transform(parsed.data as Record<string, unknown>)
    : (parsed.data as Record<string, unknown>);
  const admin = createAdminClient();
  const { error } = await admin.from(table).insert(values);
  if (error) {
    if (error.code === '23505') {
      return { error: 'That name already exists.', fieldErrors: {} };
    }
    return { error: `Creating failed: ${error.message}`, fieldErrors: {} };
  }

  for (const path of revalidatePaths) {
    revalidatePath(path);
  }
  return { error: null, fieldErrors: {} };
}

/** Delete a master-data row (inline ✕ forms — throws surface FK conflicts). */
async function deleteRow(table: string, formData: FormData): Promise<void> {
  await requireStaffUserId();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    throw new Error('Invalid id.');
  }
  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().eq('id', parsed.data.id);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
  revalidatePath('/master-data');
}

// ── Universities ────────────────────────────────────────────────────────────

export async function createUniversityAction(
  _prev: MasterDataActionState,
  formData: FormData,
): Promise<MasterDataActionState> {
  return createRow('universities', universityFormSchema, formData, [
    '/master-data',
    '/notifications',
    '/users',
    '/communities',
  ]);
}

export async function deleteUniversityAction(formData: FormData): Promise<void> {
  await deleteRow('universities', formData);
  revalidatePath('/notifications');
}

// ── Departments ─────────────────────────────────────────────────────────────

export async function createDepartmentAction(
  _prev: MasterDataActionState,
  formData: FormData,
): Promise<MasterDataActionState> {
  return createRow('departments', departmentFormSchema, formData, ['/master-data']);
}

export async function deleteDepartmentAction(formData: FormData): Promise<void> {
  await deleteRow('departments', formData);
}

// ── Subjects ────────────────────────────────────────────────────────────────

export async function createSubjectAction(
  _prev: MasterDataActionState,
  formData: FormData,
): Promise<MasterDataActionState> {
  return createRow('subjects', subjectFormSchema, formData, ['/master-data']);
}

export async function deleteSubjectAction(formData: FormData): Promise<void> {
  await deleteRow('subjects', formData);
}

// ── Skills ──────────────────────────────────────────────────────────────────

export async function createSkillAction(
  _prev: MasterDataActionState,
  formData: FormData,
): Promise<MasterDataActionState> {
  return createRow('skills', skillFormSchema, formData, ['/master-data']);
}

export async function deleteSkillAction(formData: FormData): Promise<void> {
  await deleteRow('skills', formData);
}

// ── Opportunity categories ─────────────────────────────────────────────────

export async function createCategoryAction(
  _prev: MasterDataActionState,
  formData: FormData,
): Promise<MasterDataActionState> {
  return createRow('opportunity_categories', opportunityCategoryFormSchema, formData, [
    '/master-data',
    '/opportunities',
  ]);
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await deleteRow('opportunity_categories', formData);
  revalidatePath('/opportunities');
}

// ── Tags ────────────────────────────────────────────────────────────────────

export async function createTagAction(
  _prev: MasterDataActionState,
  formData: FormData,
): Promise<MasterDataActionState> {
  // Tags are stored lowercase (same convention as the opportunity form's
  // syncTags upsert) so "AI" and "ai" can never fork into two rows.
  return createRow(
    'tags',
    tagFormSchema,
    formData,
    ['/master-data', '/opportunities'],
    (values) => ({ ...values, name: String(values.name).toLowerCase() }),
  );
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  await deleteRow('tags', formData);
  revalidatePath('/opportunities');
}
