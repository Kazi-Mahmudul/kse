'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ZodError } from 'zod';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS } from '@kse/shared';
import type {
  OpportunityStatus,
  ToletGenderPreference,
  ToletListingStatus,
  ToletRoomType,
} from '@kse/types';
import { toletAdminFormSchema, type ToletAdminFormValues } from '@kse/validation';

import type { ToletActionState } from './types';

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

function parseToletForm(formData: FormData):
  | { ok: true; values: ToletAdminFormValues }
  | { ok: false; state: ToletActionState } {
  const rawImageUrls = String(formData.get('image_urls') ?? '');
  const imageUrls = rawImageUrls
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean);

  const parsed = toletAdminFormSchema.safeParse({
    title: formData.get('title'),
    organization_name: formData.get('organization_name') ?? '',
    summary: formData.get('summary'),
    description: formData.get('description'),
    image_url: formData.get('image_url'),
    image_urls: imageUrls,
    location: formData.get('location'),
    city: formData.get('city'),
    area: formData.get('area'),
    room_type: formData.get('room_type'),
    gender_preference: formData.get('gender_preference'),
    rent_amount: formData.get('rent_amount'),
    rent_currency: formData.get('rent_currency'),
    total_rooms: formData.get('total_rooms'),
    available_rooms: formData.get('available_rooms'),
    floor: formData.get('floor'),
    bachelor_friendly: formData.get('bachelor_friendly') === 'on',
    utilities_included: formData.get('utilities_included') === 'on',
    available_from: formData.get('available_from'),
    landlord_phone: formData.get('landlord_phone'),
    whatsapp: formData.get('whatsapp'),
    contact_email: formData.get('contact_email'),
    application_url: formData.get('application_url'),
    listing_status: formData.get('listing_status'),
    status: formData.get('status'),
    verified: formData.get('verified') === 'on',
    source_name: formData.get('source_name'),
    source_url: formData.get('source_url'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      state: {
        error: 'Please fix the highlighted fields.',
        fieldErrors: fieldErrorsFrom(parsed.error),
      },
    };
  }
  return { ok: true, values: parsed.data };
}

/** Optional image upload → public URL in the tolet-listings bucket. */
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
    .from(STORAGE_BUCKETS.toletListings)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }
  return admin.storage.from(STORAGE_BUCKETS.toletListings).getPublicUrl(path)
    .data.publicUrl;
}

function buildRow(values: ToletAdminFormValues, imageUrl: string | null) {
  const row: Record<string, unknown> = {
    type: 'tolet' as const,
    title: values.title,
    organization_name: values.organization_name || null,
    summary: values.summary || null,
    description: values.description || null,
    image_url: imageUrl,
    image_urls: values.image_urls,
    location: values.location || null,
    city: values.city || null,
    area: values.area || null,
    room_type: (values.room_type as ToletRoomType) || null,
    gender_preference: (values.gender_preference as ToletGenderPreference) || null,
    rent_amount: values.rent_amount ?? null,
    rent_currency: values.rent_currency || null,
    total_rooms: values.total_rooms ?? null,
    available_rooms: values.available_rooms ?? null,
    floor: values.floor ?? null,
    bachelor_friendly: values.bachelor_friendly,
    utilities_included: values.utilities_included,
    available_from: values.available_from || null,
    landlord_phone: values.landlord_phone || null,
    whatsapp: values.whatsapp || null,
    contact_email: values.contact_email || null,
    application_url: values.application_url || null,
    listing_status: values.listing_status,
    status: values.status,
    verified: values.verified,
    source_name: values.source_name || null,
    source_url: values.source_url || null,
  };
  return row;
}

/** Create or update (id present) a Bachelor To-Let listing. */
export async function saveToletListingAction(
  _prev: ToletActionState,
  formData: FormData,
): Promise<ToletActionState> {
  const id = String(formData.get('id') ?? '');
  const parsed = parseToletForm(formData);
  if (!parsed.ok) {
    return parsed.state;
  }
  const values = parsed.values;

  try {
    const userId = await requireStaffUserId();
    const admin = createAdminClient();

    let imageUrl = await uploadImage(formData.get('image') as File | null);
    if (imageUrl === null) {
      imageUrl = values.image_url || null;
    }

    // Workflow bookkeeping — stamps on first publish, clears when un-verified.
    let existing: { published_at: string | null; verified: boolean } | null = null;
    if (id) {
      const { data } = await admin
        .from('opportunities')
        .select('published_at, verified')
        .eq('id', id)
        .single();
      existing = data;
    }

    const row = buildRow(values, imageUrl);

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

    let listingId = id;

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
      listingId = data.id;
    }

    // Audit log entry — admin write to a content table.
    await admin.from('audit_logs').insert({
      actor_id: userId,
      action: id ? 'update_tolet_listing' : 'create_tolet_listing',
      target_id: listingId,
      target_table: 'opportunities',
      metadata: { title: values.title },
    });
  } catch (error) {
    return { error: (error as Error).message, fieldErrors: {} };
  }

  revalidatePath('/tolet');
  revalidatePath(`/tolet/${id}`);
  redirect('/tolet');
}

/** Quick workflow transition (Pending → Published, etc.). */
export async function setToletStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as OpportunityStatus;

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const row: Record<string, unknown> = { status };
  if (status === 'published') {
    row.published_at = new Date().toISOString();
  }

  const { error } = await admin.from('opportunities').update(row).eq('id', id);
  if (error) {
    throw new Error(`Status change failed: ${error.message}`);
  }

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: 'set_tolet_status',
    target_id: id,
    target_table: 'opportunities',
    metadata: { status },
  });

  revalidatePath('/tolet');
  revalidatePath(`/tolet/${id}`);
}

/** Toggle room availability (`listing_status`). */
export async function setToletAvailabilityAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const listingStatus = String(formData.get('listing_status') ?? '') as ToletListingStatus;

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const { error } = await admin
    .from('opportunities')
    .update({ listing_status: listingStatus })
    .eq('id', id);
  if (error) {
    throw new Error(`Availability change failed: ${error.message}`);
  }

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: 'set_tolet_availability',
    target_id: id,
    target_table: 'opportunities',
    metadata: { listing_status: listingStatus },
  });

  revalidatePath('/tolet');
  revalidatePath(`/tolet/${id}`);
}

/** Toggle verified flag (used by quick-action button). */
export async function toggleToletVerifiedAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const next = formData.get('verified') === 'on';

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const row: Record<string, unknown> = { verified: next };
  if (next) {
    row.verified_at = new Date().toISOString();
    row.verified_by = userId;
  } else {
    row.verified_at = null;
    row.verified_by = null;
  }

  const { error } = await admin.from('opportunities').update(row).eq('id', id);
  if (error) {
    throw new Error(`Verify toggle failed: ${error.message}`);
  }

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: next ? 'verify_tolet_listing' : 'unverify_tolet_listing',
    target_id: id,
    target_table: 'opportunities',
  });

  revalidatePath('/tolet');
  revalidatePath(`/tolet/${id}`);
}

export async function deleteToletListingAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const { error } = await admin.from('opportunities').delete().eq('id', id);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: 'delete_tolet_listing',
    target_id: id,
    target_table: 'opportunities',
  });

  revalidatePath('/tolet');
  redirect('/tolet');
}
