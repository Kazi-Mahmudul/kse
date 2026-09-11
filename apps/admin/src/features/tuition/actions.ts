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

interface ApplicationRow {
  id: string;
  user_id: string;
  headline: string;
  bio: string | null;
  university_id: string | null;
  location: string | null;
  expected_fee_min: number | null;
  expected_fee_max: number | null;
  availability: string | null;
  status: 'pending' | 'approved' | 'rejected';
  tutor_application_subjects: { subject_id: string }[];
}

/**
 * Review a become-a-tutor application (spec §7). Approval copies the
 * application into a verified `tutors` row, links the subjects, and grants
 * the tutor role — all through the service role because owners can neither
 * flip is_verified (trigger) nor write user_roles (no client policy).
 */
export async function reviewTutorApplication(
  _prev: TuitionActionState,
  formData: FormData,
): Promise<TuitionActionState> {
  const applicationId = String(formData.get('applicationId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const reviewNote = String(formData.get('reviewNote') ?? '').trim();

  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) {
    return { error: 'Invalid application id.' };
  }
  if (decision !== 'approved' && decision !== 'rejected') {
    return { error: 'Invalid decision.' };
  }
  if (reviewNote.length > 500) {
    return { error: 'Review note must be 500 characters or fewer.' };
  }

  let staffUserId: string;
  try {
    staffUserId = await requireStaffUserId();
  } catch {
    return { error: 'Staff access required.' };
  }

  const admin = createAdminClient();

  const { data: application, error: fetchError } = await admin
    .from('tutor_applications')
    .select(
      'id, user_id, headline, bio, university_id, location, expected_fee_min, ' +
        'expected_fee_max, availability, status, ' +
        'tutor_application_subjects(subject_id)',
    )
    .eq('id', applicationId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!application) return { error: 'Application not found.' };

  const app = application as unknown as ApplicationRow;
  if (app.status !== 'pending') {
    return { error: 'This application was already reviewed.' };
  }

  if (decision === 'approved') {
    // 1. Verified, active tutors row (upsert — an unverified draft updates).
    const { error: tutorError } = await admin.from('tutors').upsert({
      id: app.user_id,
      headline: app.headline,
      bio: app.bio,
      university_id: app.university_id,
      location: app.location,
      expected_fee_min: app.expected_fee_min,
      expected_fee_max: app.expected_fee_max,
      availability: app.availability,
      is_verified: true,
      status: 'active',
      created_by: staffUserId,
    });
    if (tutorError) return { error: tutorError.message };

    // 2. Subjects from the application.
    const subjectIds = app.tutor_application_subjects.map(
      (link) => link.subject_id,
    );
    if (subjectIds.length > 0) {
      const { error: subjectsError } = await admin
        .from('tutor_subjects')
        .upsert(
          subjectIds.map((subject_id) => ({
            tutor_id: app.user_id,
            subject_id,
          })),
          { onConflict: 'tutor_id,subject_id', ignoreDuplicates: true },
        );
      if (subjectsError) return { error: subjectsError.message };
    }

    // 3. Grant the tutor role so the applicant can maintain their profile.
    const { error: roleError } = await admin
      .from('user_roles')
      .upsert(
        { user_id: app.user_id, role: 'tutor', granted_by: staffUserId },
        { onConflict: 'user_id,role', ignoreDuplicates: true },
      );
    if (roleError) return { error: roleError.message };
  }

  const { error: reviewError } = await admin
    .from('tutor_applications')
    .update({
      status: decision,
      review_note: reviewNote || null,
      reviewed_by: staffUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'pending');
  if (reviewError) return { error: reviewError.message };

  revalidatePath('/tuition/applications');
  revalidatePath('/tuition');
  return {};
}
