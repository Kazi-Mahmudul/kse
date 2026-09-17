import { SettingsForm } from '@/features/settings/settings-form';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateTime } from '@/lib/format';

interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string | null;
}

/** Read a setting with defaults for keys that were never written. */
function settingValue<T>(
  rows: SettingRow[],
  key: string,
  fallback: T,
): T {
  const row = rows.find((candidate) => candidate.key === key);
  return row ? (row.value as T) : fallback;
}

function urlString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Platform settings (spec §7) — key-value rows in app_settings (jsonb). */
export default async function SettingsPage() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('app_settings')
    .select('key, value, updated_at')
    .order('key');

  const rows = (data ?? []) as unknown as SettingRow[];

  const socialLinks = settingValue<Record<string, string>>(rows, 'social_links', {});

  const values = {
    maintenance_mode: settingValue<boolean>(rows, 'maintenance_mode', false),
    support_contact: settingValue<string>(rows, 'support_contact', ''),
    terms_url: urlString(settingValue<unknown>(rows, 'terms_url', null)),
    privacy_url: urlString(settingValue<unknown>(rows, 'privacy_url', null)),
    min_app_version: settingValue<string>(rows, 'min_app_version', '1.0.0'),
    facebook_url: urlString(socialLinks.facebook),
    instagram_url: urlString(socialLinks.instagram),
    linkedin_url: urlString(socialLinks.linkedin),
    website_url: urlString(socialLinks.website),
    feature_flags_json: JSON.stringify(
      settingValue<Record<string, boolean>>(rows, 'feature_flags', {}),
      null,
      2,
    ),
  };

  const lastUpdated = rows
    .map((row) => row.updated_at)
    .filter((stamp): stamp is string => Boolean(stamp))
    .sort()
    .at(-1);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Platform settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            App-wide configuration stored in app_settings
            {lastUpdated ? ` · last saved ${formatDateTime(lastUpdated)}` : ''}.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          Could not load settings: {error.message}
        </p>
      ) : (
        <div className="mt-6">
          <SettingsForm values={values} />
        </div>
      )}
    </div>
  );
}
