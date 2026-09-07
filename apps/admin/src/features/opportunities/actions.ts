'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ZodError } from 'zod';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS } from '@kse/shared';
import type { OpportunityStatus } from '@kse/types';
import { opportunityFormSchema, type OpportunityFormValues } from '@kse/validation';

import type { OpportunityActionState } from './types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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

function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function parseOpportunityForm(formData: FormData):
  | { ok: true; values: OpportunityFormValues }
  | { ok: false; state: OpportunityActionState } {
  const parsed = opportunityFormSchema.safeParse({
    type: formData.get('type'),
    title: formData.get('title'),
    organization_name: formData.get('organization_name'),
    summary: formData.get('summary'),
    description: formData.get('description'),
    image_url: formData.get('image_url'),
    location: formData.get('location'),
    opportunity_mode: formData.get('opportunity_mode'),
    eligibility: formData.get('eligibility'),
    application_url: formData.get('application_url'),
    deadline: formData.get('deadline'),
    category_id: formData.get('category_id'),
    status: formData.get('status'),
    featured: formData.get('featured'),
    verified: formData.get('verified'),
    source_name: formData.get('source_name'),
    source_url: formData.get('source_url'),
    tags: String(formData.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  });

  if (!parsed.success) {
    return {
      ok: false,
      state: { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error) },
    };
  }
  return { ok: true, values: parsed.data };
}

/** Optional image upload → public URL in the opportunity-images bucket. */
async function uploadImage(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const ext = IMAGE_EXTENSIONS[file.type];
  if (!ext) {
    throw new Error('Image must be a JPEG, PNG or WebP file.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const admin = createAdminClient();
  const path = `admin/${randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from(STORAGE_BUCKETS.opportunityImages)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }
  return admin.storage.from(STORAGE_BUCKETS.opportunityImages).getPublicUrl(path)
    .data.publicUrl;
}

/** Replaces the opportunity's tag set (tags upserted by name). */
async function syncTags(
  admin: ReturnType<typeof createAdminClient>,
  opportunityId: string,
  tagNames: string[],
): Promise<void> {
  const names = [...new Set(tagNames.map((name) => name.toLowerCase()))];

  const { data: tagRows, error: upsertError } = await admin
    .from('tags')
    .upsert(names.map((name) => ({ name })), { onConflict: 'name' })
    .select('id');

  if (upsertError) {
    throw new Error(`Saving tags failed: ${upsertError.message}`);
  }

  const { error: deleteError } = await admin
    .from('opportunity_tags')
    .delete()
    .eq('opportunity_id', opportunityId);
  if (deleteError) {
    throw new Error(`Saving tags failed: ${deleteError.message}`);
  }

  if (tagRows && tagRows.length > 0) {
    const { error: insertError } = await admin.from('opportunity_tags').insert(
      tagRows.map((row) => ({ opportunity_id: opportunityId, tag_id: row.id })),
    );
    if (insertError) {
      throw new Error(`Saving tags failed: ${insertError.message}`);
    }
  }
}

/** Create or update (id present) an opportunity. */
export async function saveOpportunityAction(
  _prev: OpportunityActionState,
  formData: FormData,
): Promise<OpportunityActionState> {
  const id = String(formData.get('id') ?? '');
  const parsed = parseOpportunityForm(formData);
  if (!parsed.ok) {
    return parsed.state;
  }
  const values = parsed.values;

  try {
    const userId = await requireStaffUserId();
    const admin = createAdminClient();

    let imageUrl = await uploadImage(formData.get('image') as File | null);
    if (imageUrl === null) {
      imageUrl = values.image_url;
    }

    // Workflow bookkeeping is decided server-side, never from the form.
    // First publish / verification stamps the timestamp; re-saves keep it.
    let existing: { published_at: string | null; verified: boolean } | null = null;
    if (id) {
      const { data } = await admin
        .from('opportunities')
        .select('published_at, verified')
        .eq('id', id)
        .single();
      existing = data;
    }

    const row: Record<string, unknown> = {
      type: values.type,
      title: values.title,
      organization_name: values.organization_name,
      summary: values.summary,
      description: values.description,
      image_url: imageUrl,
      location: values.location,
      opportunity_mode: values.opportunity_mode,
      eligibility: values.eligibility,
      application_url: values.application_url,
      deadline: values.deadline,
      category_id: values.category_id,
      status: values.status,
      featured: values.featured,
      verified: values.verified,
      source_name: values.source_name,
      source_url: values.source_url,
    };

    if (values.status === 'published' && !existing?.published_at) {
      row.published_at = new Date().toISOString();
    }

    if (values.verified && !existing?.verified) {
      row.verified_at = new Date().toISOString();
      row.verified_by = userId;
    } else if (!values.verified) {
      row.verified_at = null;
      row.verified_by = null;
    }

    let opportunityId = id;

    if (id) {
      const { error } = await admin.from('opportunities').update(row).eq('id', id);
      if (error) {
        throw new Error(`Saving failed: ${error.message}`);
      }
    } else {
      row.created_by = userId;
      const { data, error } = await admin
        .from('opportunities')
        .insert(row)
        .select('id')
        .single();
      if (error) {
        throw new Error(`Creating failed: ${error.message}`);
      }
      opportunityId = data.id;
    }

    await syncTags(admin, opportunityId, values.tags);
  } catch (error) {
    return { error: (error as Error).message, fieldErrors: {} };
  }

  revalidatePath('/opportunities');
  revalidatePath(`/opportunities/${id}`);
  redirect('/opportunities');
}

/** Quick workflow transition from the edit page. */
export async function setStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as OpportunityStatus;

  await requireStaffUserId();
  const admin = createAdminClient();

  const row: Record<string, unknown> = { status };
  if (status === 'published') {
    row.published_at = new Date().toISOString();
  }

  const { error } = await admin.from('opportunities').update(row).eq('id', id);
  if (error) {
    throw new Error(`Status change failed: ${error.message}`);
  }

  revalidatePath('/opportunities');
  revalidatePath(`/opportunities/${id}`);
}

export async function deleteOpportunityAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');

  await requireStaffUserId();
  const admin = createAdminClient();

  const { error } = await admin.from('opportunities').delete().eq('id', id);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }

  revalidatePath('/opportunities');
  redirect('/opportunities');
}
