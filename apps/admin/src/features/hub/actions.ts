'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ZodError } from 'zod';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  hubAdminFormSchema,
  hubCategoryFormSchema,
  hubOfferFormSchema,
  type HubAdminFormValues,
} from '@kse/validation';
import type { HubListingStatus } from '@kse/types';

import type { HubActionState } from './types';

/** Verified staff user (session + role read server-side). */
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

// ── Listing CRUD ─────────────────────────────────────────────────────────────

function parseListingForm(formData: FormData):
  | { ok: true; values: HubAdminFormValues }
  | { ok: false; state: HubActionState } {
  const rawServices = String(formData.get('services') ?? '');
  const rawImageUrls = String(formData.get('image_urls') ?? '');
  const services = rawServices
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const imageUrls = rawImageUrls
    .split(/[\n,]/)
    .map((u) => u.trim())
    .filter(Boolean);

  const parsed = hubAdminFormSchema.safeParse({
    category_id: formData.get('category_id'),
    name: formData.get('name'),
    service_type: formData.get('service_type'),
    summary: formData.get('summary'),
    description: formData.get('description'),
    status: formData.get('status'),
    address: formData.get('address'),
    area: formData.get('area'),
    city: formData.get('city'),
    district: formData.get('district'),
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude'),
    phone: formData.get('phone'),
    whatsapp: formData.get('whatsapp'),
    email: formData.get('email'),
    opening_hours: formData.get('opening_hours'),
    opens_at: formData.get('opens_at'),
    closes_at: formData.get('closes_at'),
    price_note: formData.get('price_note'),
    price_type: formData.get('price_type'),
    services,
    image_url: formData.get('image_url'),
    image_urls: imageUrls,
    verified: formData.get('verified') === 'on',
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

function buildListingRow(values: HubAdminFormValues): Record<string, unknown> {
  return {
    category_id: values.category_id,
    name: values.name,
    service_type: values.service_type,
    summary: values.summary || null,
    description: values.description || null,
    status: values.status,
    address: values.address || null,
    area: values.area || null,
    city: values.city,
    district: values.district || null,
    latitude: values.latitude ?? null,
    longitude: values.longitude ?? null,
    phone: values.phone || null,
    whatsapp: values.whatsapp || null,
    email: values.email || null,
    opening_hours: values.opening_hours || null,
    opens_at: values.opens_at || null,
    closes_at: values.closes_at || null,
    price_note: values.price_note || null,
    price_type: values.price_type || null,
    services: values.services,
    image_url: values.image_url || values.image_urls[0] || null,
    image_urls: values.image_urls,
  };
}

/** Create or update (id present) a Student Hub listing. */
export async function saveHubListingAction(
  _prev: HubActionState,
  formData: FormData,
): Promise<HubActionState> {
  const id = String(formData.get('id') ?? '');
  const parsed = parseListingForm(formData);
  if (!parsed.ok) {
    return parsed.state;
  }
  const values = parsed.values;

  let listingId = id;
  try {
    const userId = await requireStaffUserId();
    const admin = createAdminClient();

    let existing: { published_at: string | null; verified: boolean } | null = null;
    if (id) {
      const { data } = await admin
        .from('student_hub_listings')
        .select('published_at, verified')
        .eq('id', id)
        .single();
      existing = data;
    }

    const row = buildListingRow(values);
    if (values.status === 'published' && !existing?.published_at) {
      row.published_at = new Date().toISOString();
    }
    if (values.verified && !existing?.verified) {
      row.verified_at = new Date().toISOString();
      row.verified_by = userId;
      row.last_verified_at = new Date().toISOString();
    } else if (!values.verified) {
      row.verified_at = null;
      row.verified_by = null;
    }

    if (id) {
      const { error } = await admin
        .from('student_hub_listings')
        .update(row)
        .eq('id', id);
      if (error) throw new Error(`Saving failed: ${error.message}`);
    } else {
      row.created_by = userId;
      const { data, error } = await admin
        .from('student_hub_listings')
        .insert(row)
        .select('id')
        .single();
      if (error) throw new Error(`Creating failed: ${error.message}`);
      listingId = data.id;
    }

    await admin.from('audit_logs').insert({
      actor_id: userId,
      action: id ? 'update_hub_listing' : 'create_hub_listing',
      entity_type: 'student_hub_listings',
      entity_id: listingId,
      new_value: { name: values.name },
    });
  } catch (error) {
    return { error: (error as Error).message, fieldErrors: {} };
  }

  revalidatePath('/hub');
  revalidatePath(`/hub/${listingId}`);
  redirect('/hub');
}

async function notifySubmitter(
  listingId: string,
  approved: boolean,
  reviewNote: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from('student_hub_listings')
    .select('name, submitted_by')
    .eq('id', listingId)
    .maybeSingle();
  if (!listing?.submitted_by) return;

  await admin.from('notifications').insert({
    user_id: listing.submitted_by,
    type: approved ? 'hub_listing_approved' : 'hub_listing_rejected',
    title: approved ? 'Your suggestion was approved' : 'Your suggestion was not approved',
    body: approved
      ? `"${listing.name}" is now live in Student Hub. Thank you for contributing!`
      : `"${listing.name}" was not approved.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
    data: { listing_id: listingId },
  });
}

/**
 * Workflow transition (approve/reject/publish/suspend/archive). Approving or
 * rejecting a user submission also notifies the submitter (spec student-hub §25).
 */
export async function setHubListingStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as HubListingStatus;
  const reviewNote = String(formData.get('review_note') ?? '').trim() || null;

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const { data: before } = await admin
    .from('student_hub_listings')
    .select('status, source, submitted_by')
    .eq('id', id)
    .maybeSingle();
  if (!before) throw new Error('Listing not found.');

  const row: Record<string, unknown> = { status };
  if (reviewNote) row.review_note = reviewNote;
  if (status === 'published') {
    row.published_at = new Date().toISOString();
  }
  if (status === 'rejected') {
    row.review_note = reviewNote ?? 'Rejected by review';
  }

  const { error } = await admin.from('student_hub_listings').update(row).eq('id', id);
  if (error) throw new Error(`Status change failed: ${error.message}`);

  // Notify the student only for their own submissions and real transitions.
  if (
    before.source === 'user_submission' &&
    before.submitted_by &&
    before.status !== status &&
    (status === 'published' || status === 'rejected')
  ) {
    await notifySubmitter(id, status === 'published', reviewNote);
  }

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: 'set_hub_listing_status',
    entity_type: 'student_hub_listings',
    entity_id: id,
    new_value: { status, review_note: reviewNote },
  });

  revalidatePath('/hub');
  revalidatePath('/hub/pending');
  revalidatePath(`/hub/${id}`);
}

/** Toggle verification (spec student-hub §21). Users can never set this. */
export async function toggleHubVerifiedAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const next = formData.get('verified') === 'on';

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const row: Record<string, unknown> = { verified: next };
  if (next) {
    row.verified_at = new Date().toISOString();
    row.verified_by = userId;
    row.last_verified_at = new Date().toISOString();
  } else {
    row.verified_at = null;
    row.verified_by = null;
  }

  const { error } = await admin
    .from('student_hub_listings')
    .update(row)
    .eq('id', id);
  if (error) throw new Error(`Verify toggle failed: ${error.message}`);

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: next ? 'verify_hub_listing' : 'unverify_hub_listing',
    entity_type: 'student_hub_listings',
    entity_id: id,
  });

  revalidatePath('/hub');
  revalidatePath(`/hub/${id}`);
}

export async function deleteHubListingAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const { error } = await admin.from('student_hub_listings').delete().eq('id', id);
  if (error) throw new Error(`Delete failed: ${error.message}`);

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: 'delete_hub_listing',
    entity_type: 'student_hub_listings',
    entity_id: id,
  });

  revalidatePath('/hub');
  redirect('/hub');
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function saveHubCategoryAction(formData: FormData): Promise<void> {
  const parsed = hubCategoryFormSchema.safeParse({
    id: formData.get('id'),
    slug: formData.get('slug'),
    name: formData.get('name'),
    description: formData.get('description'),
    icon: formData.get('icon') ?? 'grid-outline',
    features: formData.getAll('features'),
    sort_order: formData.get('sort_order') ?? 0,
    is_active: formData.get('is_active') === 'on',
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    );
  }
  const values = parsed.data;

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const row = {
    slug: values.slug,
    name: values.name,
    description: values.description,
    icon: values.icon,
    features: values.features,
    sort_order: values.sort_order ?? 0,
    is_active: values.is_active,
  };

  const { error } = values.id
    ? await admin.from('student_hub_categories').update(row).eq('id', values.id)
    : await admin.from('student_hub_categories').insert(row);
  if (error) throw new Error(`Saving category failed: ${error.message}`);

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: values.id ? 'update_hub_category' : 'create_hub_category',
    entity_type: 'student_hub_categories',
    entity_id: values.id,
    new_value: { slug: values.slug },
  });

  revalidatePath('/hub/categories');
}

export async function moveHubCategoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const delta = Number(formData.get('delta') ?? 0);

  await requireStaffUserId();
  const admin = createAdminClient();

  const { data: category } = await admin
    .from('student_hub_categories')
    .select('sort_order')
    .eq('id', id)
    .single();
  if (!category) throw new Error('Category not found.');

  const { error } = await admin
    .from('student_hub_categories')
    .update({ sort_order: Math.max(0, category.sort_order + delta) })
    .eq('id', id);
  if (error) throw new Error(`Reorder failed: ${error.message}`);

  revalidatePath('/hub/categories');
}

// ── Offers ───────────────────────────────────────────────────────────────────

export async function saveHubOfferAction(formData: FormData): Promise<void> {
  const listingId = String(formData.get('listing_id') ?? '');
  const id = String(formData.get('id') ?? '');

  const parsed = hubOfferFormSchema.safeParse({
    listing_id: listingId,
    title: formData.get('title'),
    discount_kind: formData.get('discount_kind'),
    // Amount offers are entered in TAKA; convert to paisa. Percent stays as-is.
    discount_value:
      String(formData.get('discount_kind') ?? '') === 'amount'
        ? Number(formData.get('discount_value') ?? 0) * 100
        : formData.get('discount_value'),
    applies_to: formData.get('applies_to'),
    student_id_required: formData.get('student_id_required') === 'on',
    valid_from: formData.get('valid_from'),
    valid_until: formData.get('valid_until'),
    terms: formData.get('terms'),
    is_active: formData.get('is_active') === 'on',
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    );
  }
  const values = parsed.data;

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const { error } = id
    ? await admin.from('student_hub_offers').update(values).eq('id', id)
    : await admin.from('student_hub_offers').insert(values);
  if (error) throw new Error(`Saving offer failed: ${error.message}`);

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: id ? 'update_hub_offer' : 'create_hub_offer',
    entity_type: 'student_hub_offers',
    entity_id: id || listingId,
    new_value: { title: values.title },
  });

  revalidatePath(`/hub/${listingId}`);
}

export async function deleteHubOfferAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const listingId = String(formData.get('listing_id') ?? '');

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const { error } = await admin.from('student_hub_offers').delete().eq('id', id);
  if (error) throw new Error(`Delete failed: ${error.message}`);

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: 'delete_hub_offer',
    entity_type: 'student_hub_offers',
    entity_id: id,
  });

  revalidatePath(`/hub/${listingId}`);
}

// ── Reports (central reports table, hub targets) ─────────────────────────────

export async function resolveHubReportAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as
    | 'reviewing'
    | 'resolved'
    | 'dismissed';
  const resolutionNote = String(formData.get('resolution_note') ?? '').trim() || null;

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const { error } = await admin
    .from('reports')
    .update({
      status,
      resolved_by: status === 'reviewing' ? null : userId,
      resolution_note: resolutionNote,
    })
    .eq('id', id)
    .in('target_type', ['student_hub_listing', 'book_listing', 'research_profile']);
  if (error) throw new Error(`Report update failed: ${error.message}`);

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: 'resolve_hub_report',
    entity_type: 'reports',
    entity_id: id,
    new_value: { status, resolution_note: resolutionNote },
  });

  revalidatePath('/hub/reports');
}

// ── Book Exchange moderation ─────────────────────────────────────────────────

export async function setBookListingStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as
    | 'active'
    | 'reserved'
    | 'exchanged'
    | 'sold'
    | 'removed';

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const { error } = await admin
    .from('student_book_listings')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(`Status change failed: ${error.message}`);

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: 'set_book_listing_status',
    entity_type: 'student_book_listings',
    entity_id: id,
    new_value: { status },
  });

  revalidatePath('/hub/book-exchange');
}

// ── Research partner moderation ──────────────────────────────────────────────

export async function setResearchProfileStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as 'active' | 'hidden';

  const userId = await requireStaffUserId();
  const admin = createAdminClient();

  const { error } = await admin
    .from('research_profiles')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(`Status change failed: ${error.message}`);

  await admin.from('audit_logs').insert({
    actor_id: userId,
    action: 'set_research_profile_status',
    entity_type: 'research_profiles',
    entity_id: id,
    new_value: { status },
  });

  revalidatePath('/hub/research');
}
