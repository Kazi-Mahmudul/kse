'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Guard: verified staff only. */
async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  const { data: roles } = await supabase.from('user_roles').select('role');
  if (!isStaff((roles ?? []).map((r) => r.role as string))) {
    throw new Error('Staff access required.');
  }
  return user.id;
}

/** Sync tag strings with public.tags and public.opportunity_tags. */
async function syncOpportunityTags(admin: any, opportunityId: string, tags: string[]) {
  const cleaned = Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)));
  if (cleaned.length === 0) return;

  const { data: tagRows, error: upsertError } = await admin
    .from('tags')
    .upsert(
      cleaned.map((name) => ({ name })),
      { onConflict: 'name' },
    )
    .select('id');

  if (upsertError) {
    console.error('Failed to upsert tags:', upsertError);
    return;
  }

  if (tagRows && tagRows.length > 0) {
    await admin.from('opportunity_tags').delete().eq('opportunity_id', opportunityId);
    await admin.from('opportunity_tags').insert(
      tagRows.map((row: any) => ({ opportunity_id: opportunityId, tag_id: row.id })),
    );
  }
}

// ─── Mentor opportunity actions ───────────────────────────────────────────────

/** Create a new mentor opportunity and publish or draft it. */
export async function createMentorAction(formData: FormData) {
  const staffId = await requireStaff();
  const admin = createAdminClient();

  const title = (formData.get('title') as string | null)?.trim();
  const organization_name = (formData.get('organization_name') as string | null)?.trim();
  if (!title || !organization_name) {
    throw new Error('Mentor name and current organization are required.');
  }

  const summary = (formData.get('summary') as string | null)?.trim() || null;
  const description = (formData.get('description') as string | null)?.trim() || null;
  const education = (formData.get('education') as string | null)?.trim() || null;
  const experience_years = formData.get('experience_years')
    ? Number(formData.get('experience_years'))
    : 3;
  const rating_avg = formData.get('rating_avg')
    ? Number(formData.get('rating_avg'))
    : 4.8;
  const rating_count = formData.get('rating_count')
    ? Number(formData.get('rating_count'))
    : 10;
  let opportunity_mode = (formData.get('opportunity_mode') as string | null) || 'remote';
  if (opportunity_mode === 'online') opportunity_mode = 'remote';
  const location = (formData.get('location') as string | null)?.trim() || 'Khulna / Remote';
  const category_id = (formData.get('category_id') as string | null)?.trim() || null;
  const source_url = (formData.get('source_url') as string | null)?.trim() || null;
  const source_name = (formData.get('source_name') as string | null)?.trim() || 'LinkedIn';
  const image_url = (formData.get('image_url') as string | null)?.trim() || null;
  const status = (formData.get('status') as string | null) || 'published';
  const featured = formData.get('featured') === 'on' || formData.get('featured') === 'true';
  const verified = formData.get('verified') === 'on' || formData.get('verified') === 'true';

  const published_at = status === 'published' ? new Date().toISOString() : null;

  const insertPayload = {
    type: 'mentorship',
    title,
    organization_name,
    summary,
    description,
    education,
    experience_years,
    rating_avg,
    rating_count,
    opportunity_mode,
    location,
    category_id: category_id || null,
    source_name,
    source_url,
    image_url,
    status,
    published_at,
    featured,
    verified,
    created_by: staffId,
  };

  const { data: opp, error } = await admin
    .from('opportunities')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create mentor: ${error.message}`);
  }

  const tagString = (formData.get('tags') as string | null) ?? '';
  const rawTags = tagString
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (rawTags.length > 0 && opp?.id) {
    await syncOpportunityTags(admin, opp.id, rawTags);
  }

  revalidatePath('/mentorship');
  redirect(`/mentorship/${opp.id}`);
}

/** Publish / archive / reject a mentor opportunity from the admin panel. */
export async function setMentorStatusAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));

  const patch: Record<string, unknown> = { status };
  if (status === 'published') patch.published_at = new Date().toISOString();

  const { error } = await admin.from('opportunities').update(patch).eq('id', id).eq('type', 'mentorship');
  if (error) throw new Error(error.message);

  revalidatePath('/mentorship');
  revalidatePath(`/mentorship/${id}`);
}

/** Toggle featured/verified flags on a mentor. */
export async function toggleMentorFlagAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();
  const id = String(formData.get('id'));
  const field = String(formData.get('field')) as 'featured' | 'verified';
  const value = formData.get('value') === 'true';

  const { error } = await admin.from('opportunities').update({ [field]: value }).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/mentorship');
  revalidatePath(`/mentorship/${id}`);
}

/** Save mentor-specific profile fields (experience_years, education, tags). */
export async function saveMentorProfileAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();
  const id = String(formData.get('id'));

  const patch: Record<string, unknown> = {
    title: (formData.get('title') as string | null)?.trim() || undefined,
    organization_name: (formData.get('organization_name') as string | null)?.trim() || undefined,
    summary: (formData.get('summary') as string | null)?.trim() || undefined,
    description: (formData.get('description') as string | null)?.trim() || undefined,
    education: (formData.get('education') as string | null)?.trim() || undefined,
    image_url: (formData.get('image_url') as string | null)?.trim() || undefined,
    category_id: (formData.get('category_id') as string | null)?.trim() || undefined,
    experience_years: formData.get('experience_years')
      ? Number(formData.get('experience_years'))
      : null,
    rating_avg: formData.get('rating_avg')
      ? Number(formData.get('rating_avg'))
      : undefined,
    rating_count: formData.get('rating_count')
      ? Number(formData.get('rating_count'))
      : undefined,
    opportunity_mode: formData.get('opportunity_mode')
      ? (formData.get('opportunity_mode') === 'online' ? 'remote' : formData.get('opportunity_mode'))
      : undefined,
    location: (formData.get('location') as string | null)?.trim() || undefined,
    source_url: (formData.get('source_url') as string | null)?.trim() || undefined,
    featured: formData.get('featured') === 'on',
    verified: formData.get('verified') === 'on',
  };

  const { error } = await admin.from('opportunities').update(patch).eq('id', id);
  if (error) throw new Error(error.message);

  const tagString = formData.get('tags') as string | null;
  if (tagString !== null) {
    const rawTags = tagString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await syncOpportunityTags(admin, id, rawTags);
  }

  revalidatePath('/mentorship');
  revalidatePath(`/mentorship/${id}`);
}

// ─── Session request actions ──────────────────────────────────────────────────

/** Update a session request status: pending → accepted | closed | rejected. */
export async function updateSessionStatusAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();
  const id = String(formData.get('id'));
  let status = String(formData.get('status'));

  // Normalize to database enum mentorship_request_status ('pending', 'accepted', 'rejected', 'closed')
  if (status === 'confirmed') status = 'accepted';
  else if (status === 'completed') status = 'closed';
  else if (status === 'cancelled') status = 'rejected';

  const { error } = await admin
    .from('mentorship_requests')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/mentorship/sessions');
}

// ─── Q&A question actions ─────────────────────────────────────────────────────

/** Post an answer to a student question and mark it as answered. */
export async function answerQuestionAction(formData: FormData) {
  const staffId = await requireStaff();
  const admin = createAdminClient();
  const id = String(formData.get('id'));
  const answer = String(formData.get('answer')).trim();

  if (!answer) throw new Error('Answer cannot be empty.');

  const { error } = await admin
    .from('mentor_questions')
    .update({
      answer,
      status: 'answered',
      answered_by: staffId,
      answered_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/mentorship/questions');
}

/** Close a question without answering it. */
export async function closeQuestionAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();
  const id = String(formData.get('id'));

  const { error } = await admin
    .from('mentor_questions')
    .update({ status: 'closed' })
    .eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/mentorship/questions');
}

// ─── Discussion actions ───────────────────────────────────────────────────────

/** Create a new mentor discussion post. */
export async function createDiscussionAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();
  const opportunity_id = String(formData.get('opportunity_id'));
  const title = String(formData.get('title')).trim();
  const content = String(formData.get('content')).trim();

  if (!title || !content) throw new Error('Title and content are required.');

  const { error } = await admin.from('mentor_discussions').insert({
    opportunity_id,
    title,
    content,
    likes_count: 0,
    comments_count: 0,
  });
  if (error) throw new Error(error.message);

  revalidatePath('/mentorship/discussions');
}

/** Delete a mentor discussion post. */
export async function deleteDiscussionAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();
  const id = String(formData.get('id'));

  const { error } = await admin.from('mentor_discussions').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/mentorship/discussions');
}
