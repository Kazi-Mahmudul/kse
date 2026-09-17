'use server';

import { revalidatePath } from 'next/cache';

import { isStaff } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { settingsFormSchema } from '@kse/validation';

export interface SettingsActionState {
  error: string | null;
  saved: boolean;
}

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
 * Save every platform setting (spec §7) to the app_settings key-value
 * table. Values are jsonb blobs; updated_by is stamped for the audit
 * trail. Keys with no value yet are created by the upsert.
 */
export async function saveSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const staffId = await requireStaffUserId();
    const parsed = settingsFormSchema.safeParse({
      maintenance_mode: formData.get('maintenance_mode'),
      support_contact: formData.get('support_contact'),
      terms_url: formData.get('terms_url'),
      privacy_url: formData.get('privacy_url'),
      min_app_version: formData.get('min_app_version'),
      facebook_url: formData.get('facebook_url'),
      instagram_url: formData.get('instagram_url'),
      linkedin_url: formData.get('linkedin_url'),
      website_url: formData.get('website_url'),
      feature_flags: formData.get('feature_flags'),
    });

    if (!parsed.success) {
      return {
        error:
          parsed.error.issues[0]?.message ?? 'Please fix the highlighted fields.',
        saved: false,
      };
    }
    const values = parsed.data;

    const socialLinks: Record<string, string> = {};
    if (values.facebook_url) socialLinks.facebook = values.facebook_url;
    if (values.instagram_url) socialLinks.instagram = values.instagram_url;
    if (values.linkedin_url) socialLinks.linkedin = values.linkedin_url;
    if (values.website_url) socialLinks.website = values.website_url;

    const rows = [
      { key: 'maintenance_mode', value: values.maintenance_mode, updated_by: staffId },
      { key: 'support_contact', value: values.support_contact, updated_by: staffId },
      { key: 'terms_url', value: values.terms_url, updated_by: staffId },
      { key: 'privacy_url', value: values.privacy_url, updated_by: staffId },
      { key: 'min_app_version', value: values.min_app_version, updated_by: staffId },
      { key: 'social_links', value: socialLinks, updated_by: staffId },
      { key: 'feature_flags', value: values.feature_flags, updated_by: staffId },
    ];

    const admin = createAdminClient();
    const { error } = await admin
      .from('app_settings')
      .upsert(rows, { onConflict: 'key' });
    if (error) {
      return { error: `Saving failed: ${error.message}`, saved: false };
    }

    revalidatePath('/settings');
    return { error: null, saved: true };
  } catch (error) {
    return { error: (error as Error).message, saved: false };
  }
}
