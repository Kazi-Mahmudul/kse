/**
 * Mess Settings (spec §18): mess information, meal cut-offs, members and
 * announcements. Only the manager can change settings — the edge function
 * enforces it; members get a read-only view (they still need to see the
 * cut-off times that govern their meal toggles).
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { alertInfo } from '@/lib/dialogs';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { BackHeader } from '@/components/back-header';
import { Screen } from '@/components/ui/screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { InputField } from '@/features/mess/components/input-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useCreateAnnouncement,
  useMealCutoffSettings,
  useMessDetail,
  useUpdateMealCutoffs,
  useUpdateMessSettings,
} from '@/features/mess/queries';
import { SectionLabel } from '@/features/mess/components/section-label';
import { InlineLoading } from '@/features/mess/components/list-state';
import { useAuthStore } from '@/store/auth-store';
import type { MealCutoffSettings, MealType } from '@kse/types';

const MEALS: { key: MealType; label: string; placeholder: string }[] = [
  { key: 'breakfast', label: 'Breakfast cut-off (HH:MM)', placeholder: 'e.g. 22:00' },
  { key: 'lunch', label: 'Lunch cut-off (HH:MM)', placeholder: 'e.g. 11:00' },
  { key: 'dinner', label: 'Dinner cut-off (HH:MM)', placeholder: 'e.g. 16:00' },
];

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export default function MessSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const messId = String(id ?? '');
  const currentUserId = useAuthStore((s) => s.session?.user?.id ?? null);

  const { data: mess } = useMessDetail(messId);
  const { data: cutoffs } = useMealCutoffSettings(messId);
  const updateMess = useUpdateMessSettings();
  const updateCutoffs = useUpdateMealCutoffs();
  const createAnnouncement = useCreateAnnouncement();

  const isManager = mess?.manager_id === currentUserId;

  return (
    <Screen>
      <BackHeader title="Mess Settings" />

      {mess ? (
        <View style={styles.body}>
          {/* Mess information (§18) */}
          <SectionLabel>MESS INFORMATION</SectionLabel>
          {isManager ? (
            <MessInfoForm
              key={`info-${mess.id}`}
              initial={{ name: mess.name, location: mess.location ?? '', address: mess.address ?? '' }}
              loading={updateMess.isPending}
              onSave={async (patch) => {
                try {
                  await updateMess.mutateAsync({ messId, patch });
                  alertInfo('Saved', 'Mess information updated.');
                } catch (e) {
                  alertInfo('Could not save', (e as Error).message);
                }
              }}
            />
          ) : (
            <View style={[styles.readonly, { backgroundColor: colors.surfaceMuted }]}>
              <ThemedText type="smallBold">{mess.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[mess.location, mess.address].filter(Boolean).join(', ') || 'No location set'}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Managed by {mess.manager_name ?? 'the manager'}
              </ThemedText>
            </View>
          )}

          {/* Meal settings (§18) */}
          <SectionLabel>MEAL SETTINGS</SectionLabel>
          {isManager ? (
            <CutoffForm
              key={`cutoffs-${cutoffs?.id ?? 'none'}`}
              cutoffs={cutoffs}
              loading={updateCutoffs.isPending}
              onSave={async (values) => {
                try {
                  await updateCutoffs.mutateAsync({ messId, cutoffs: values });
                  alertInfo('Saved', 'Meal cut-offs updated.');
                } catch (e) {
                  alertInfo('Could not save cut-offs', (e as Error).message);
                }
              }}
            />
          ) : (
            <View style={[styles.readonly, { backgroundColor: colors.surfaceMuted, gap: 8 }]}>
              {MEALS.map((m) => (
                <View key={m.key} style={styles.cutoffRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {m.label.replace(' (HH:MM)', '')}
                  </ThemedText>
                  <ThemedText type="smallBold">{formatCutoff(cutoffs, m.key)}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Announcements (§17 — manager composes) */}
          {isManager ? (
            <AnnouncementForm
              loading={createAnnouncement.isPending}
              onSave={async (input) => {
                try {
                  await createAnnouncement.mutateAsync(input);
                  alertInfo('Posted', 'Members will see it on the mess home.');
                  return true;
                } catch (e) {
                  alertInfo('Could not post', (e as Error).message);
                  return false;
                }
              }}
            />
          ) : null}

          {/* Links */}
          <SectionLabel>MORE</SectionLabel>
          <View style={styles.links}>
            <PrimaryButton
              label="Members"
              variant="outline"
              onPress={() => router.push({ pathname: '/mess/[id]/members', params: { id: messId } } as never)}
            />
            <PrimaryButton
              label="Duty Calendar"
              variant="outline"
              onPress={() => router.push({ pathname: '/mess/[id]/bazar/duty', params: { id: messId } } as never)}
            />
          </View>
        </View>
      ) : (
        <InlineLoading />
      )}
    </Screen>
  );
}

// ── Mess info form ───────────────────────────────────────────────────────────

function MessInfoForm({
  initial,
  loading,
  onSave,
}: {
  initial: { name: string; location: string; address: string };
  loading: boolean;
  onSave: (patch: { name?: string; location?: string; address?: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [location, setLocation] = useState(initial.location);
  const [address, setAddress] = useState(initial.address);

  return (
    <View style={styles.form}>
      <InputField value={name} onChangeText={setName} label="Mess name" placeholder="Mess name" />
      <InputField value={location} onChangeText={setLocation} label="Location" placeholder="e.g. Boyra, Khulna" />
      <InputField value={address} onChangeText={setAddress} label="Address" placeholder="Full address" />
      <PrimaryButton
        label="Save Information"
        size="compact"
        loading={loading}
        disabled={name.trim().length === 0}
        onPress={() =>
          onSave({
            name: name.trim(),
            location: location.trim() || undefined,
            address: address.trim() || undefined,
          })
        }
        style={styles.alignStart}
      />
    </View>
  );
}

// ── Cutoff form ──────────────────────────────────────────────────────────────

function CutoffForm({
  cutoffs,
  loading,
  onSave,
}: {
  cutoffs: MealCutoffSettings | null | undefined;
  loading: boolean;
  onSave: (values: { breakfast?: string | null; lunch?: string | null; dinner?: string | null }) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<MealType, string>>({
    breakfast: (cutoffs?.breakfast_cutoff_time ?? '').slice(0, 5),
    lunch: (cutoffs?.lunch_cutoff_time ?? '').slice(0, 5),
    dinner: (cutoffs?.dinner_cutoff_time ?? '').slice(0, 5),
  });

  const allValid = MEALS.every((m) => values[m.key] === '' || TIME_RE.test(values[m.key]));

  return (
    <View style={styles.form}>
      {MEALS.map((m) => (
        <InputField
          key={m.key}
          value={values[m.key]}
          onChangeText={(v) => setValues((prev) => ({ ...prev, [m.key]: v }))}
          label={m.label}
          placeholder={`${m.placeholder} — empty for default`}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          autoCorrect={false}
        />
      ))}
      {!allValid ? (
        <ThemedText type="small" themeColor="danger">
          Use 24-hour HH:MM (e.g. 16:00) or leave empty for the default.
        </ThemedText>
      ) : null}
      <PrimaryButton
        label="Save Cut-offs"
        size="compact"
        loading={loading}
        disabled={!allValid}
        onPress={() =>
          onSave({
            breakfast: values.breakfast || null,
            lunch: values.lunch || null,
            dinner: values.dinner || null,
          })
        }
        style={styles.alignStart}
      />
    </View>
  );
}

// ── Announcement form (§17) ──────────────────────────────────────────────────

function AnnouncementForm({
  loading,
  onSave,
}: {
  loading: boolean;
  onSave: (input: { mess_id: string; title: string; content: string }) => Promise<boolean>;
}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const messId = String(id ?? '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  return (
    <View style={styles.form}>
      <SectionLabel>POST ANNOUNCEMENT</SectionLabel>
      <InputField value={title} onChangeText={setTitle} label="Title" placeholder="e.g. Dinner cancelled tomorrow" />
      <InputField value={content} onChangeText={setContent} label="Message" placeholder="Short message for members" multiline />
      <PrimaryButton
        label="Post"
        size="compact"
        loading={loading}
        disabled={title.trim().length === 0 || content.trim().length === 0}
        onPress={async () => {
          const ok = await onSave({ mess_id: messId, title: title.trim(), content: content.trim() });
          if (ok) {
            setTitle('');
            setContent('');
          }
        }}
        style={styles.alignStart}
      />
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCutoff(cutoffs: MealCutoffSettings | null | undefined, meal: MealType): string {
  if (!cutoffs) return 'Default';
  const time = cutoffs[`${meal}_cutoff_time` as const];
  if (time) return time.slice(0, 5);
  const minutes = cutoffs[`${meal}_cutoff_minutes` as const];
  return `default · ${minutes} min before`;
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three - 6,
  },
  readonly: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: 4,
  },
  cutoffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  form: {
    gap: Spacing.three - 6,
  },
  links: {
    gap: Spacing.two,
  },
  alignStart: {
    alignSelf: 'flex-start',
  },
});
