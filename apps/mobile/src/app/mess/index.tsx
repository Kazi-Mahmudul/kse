/**
 * Mess Hub — the user's mess list, create and join (spec §3 entry point).
 * Join resolves the human mess code to the mess record first — the edge
 * action needs the mess UUID.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { alertInfo } from '@/lib/dialogs';
import { useForm } from 'react-hook-form';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useCreateMess, useJoinMess, useMyMesses } from '@/features/mess/queries';
import { Sheet } from '@/features/mess/components/sheet';
import { InlineLoading, ErrorBox } from '@/features/mess/components/list-state';
import { supabase } from '@/lib/supabase';

export default function MessHubScreen() {
  const colors = useTheme();
  const goBack = useSmartBack('/');
  const router = useRouter();
  const { data: messes, isLoading, isError, error, refetch } = useMyMesses();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const active = messes?.filter((m) => m.status === 'active') ?? [];
  const pending = messes?.filter((m) => m.status === 'pending') ?? [];

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleWrap}>
          <ThemedText type="subtitle">Mess Management</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Meals, bazar and settlement for your mess
          </ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        {isLoading ? (
          <InlineLoading label="Loading your messes…" />
        ) : isError ? (
          <ErrorBox message={error?.message ?? 'Please try again.'} onRetry={() => refetch()} />
        ) : active.length === 0 && pending.length === 0 ? (
          <EmptyState
            icon="restaurant-outline"
            title="No mess yet"
            message="Create a mess for your friends, or join one with its code."
            actionLabel="Create a Mess"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <View style={styles.list}>
            {pending.map((mess) => (
              <View
                key={mess.id}
                style={[styles.card, { backgroundColor: `${colors.warning}14`, borderColor: `${colors.warning}55` }]}
              >
                <View style={[styles.cardIcon, { backgroundColor: `${colors.warning}26` }]}>
                  <Ionicons name="time-outline" size={18} color={colors.warning} />
                </View>
                <View style={styles.cardMeta}>
                  <ThemedText type="smallBold">{mess.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Waiting for manager approval
                  </ThemedText>
                </View>
              </View>
            ))}

            {active.map((mess) => (
              <Pressable
                key={mess.id}
                onPress={() => router.push({ pathname: '/mess/[id]', params: { id: mess.id } } as never)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${mess.name}`}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.cardIcon, { backgroundColor: `${colors.primary}1A` }]}>
                  <Ionicons name="home-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.cardMeta}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>
                    {mess.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {[mess.location, mess.role === 'manager' ? 'You manage this mess' : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Join with Code"
          variant="outline"
          onPress={() => setShowJoin(true)}
          style={styles.footerBtn}
        />
        <PrimaryButton label="Create Mess" onPress={() => setShowCreate(true)} style={styles.footerBtn} />
      </View>

      <CreateMessSheet visible={showCreate} onClose={() => setShowCreate(false)} />
      <JoinMessSheet visible={showJoin} onClose={() => setShowJoin(false)} />
    </Screen>
  );
}

// ── Create ───────────────────────────────────────────────────────────────────

function CreateMessSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createMess = useCreateMess();
  const router = useRouter();

  const onSubmit = async (data: Record<string, string>) => {
    try {
      const mess = await createMess.mutateAsync({
        name: data.name,
        location: data.location || undefined,
        address: data.address || undefined,
        max_members: parseInt(data.max_members || '10', 10) || 10,
      });
      onClose();
      if (mess?.id) router.push({ pathname: '/mess/[id]', params: { id: mess.id } } as never);
    } catch (e) {
      alertInfo('Could not create mess', (e as Error).message);
    }
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Create a Mess"
      submitLabel="Create"
      loading={createMess.isPending}
      fields={[
        { name: 'name', label: 'Mess name', placeholder: 'e.g. 12 No. Bachelor Mess', required: true },
        { name: 'location', label: 'Location', placeholder: 'e.g. Boyra, Khulna' },
        { name: 'max_members', label: 'Max members', placeholder: '10', keyboard: 'number-pad' },
      ]}
      onSubmit={onSubmit}
    />
  );
}

// ── Join ─────────────────────────────────────────────────────────────────────

function JoinMessSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const joinMess = useJoinMess();
  const [resolving, setResolving] = useState(false);

  const onSubmit = async (data: Record<string, string>) => {
    const code = data.code.trim();
    if (!code) return;
    setResolving(true);
    try {
      // Resolve the human code to the mess record — messes are publicly
      // readable while active; the edge action needs the UUID.
      const { data: mess, error: lookupError } = await supabase
        .from('messes')
        .select('id, name')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!mess) throw new Error('No active mess found with that code. Check the code with your manager.');

      await joinMess.mutateAsync({ messId: mess.id, inviteCode: data.invite_code || undefined });
      alertInfo('Request sent', `Waiting for the manager of "${mess.name}" to approve you.`);
      onClose();
    } catch (e) {
      alertInfo('Could not join', (e as Error).message);
    } finally {
      setResolving(false);
    }
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Join a Mess"
      submitLabel="Send Join Request"
      loading={joinMess.isPending || resolving}
      fields={[
        { name: 'code', label: 'Mess code', placeholder: 'e.g. MESS-8F42', required: true, autoCap: 'characters' },
        { name: 'invite_code', label: 'Invite code (optional)', placeholder: 'If you have one' },
      ]}
      onSubmit={onSubmit}
    />
  );
}

// ── Shared sheet form ────────────────────────────────────────────────────────

interface FieldDef {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  keyboard?: 'default' | 'number-pad';
  autoCap?: 'none' | 'characters';
}

function FormSheet({
  visible,
  onClose,
  title,
  submitLabel,
  loading,
  fields,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  loading: boolean;
  fields: FieldDef[];
  onSubmit: (data: Record<string, string>) => Promise<void> | void;
}) {
  const { control, handleSubmit } = useFormLite(fields);
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.form}>
        {fields.map((f) => (
          <TextField
            key={f.name}
            control={control}
            name={f.name}
            label={f.label}
            placeholder={f.placeholder}
            keyboardType={f.keyboard}
            autoCapitalize={f.autoCap ?? 'sentences'}
          />
        ))}
        <PrimaryButton label={submitLabel} loading={loading} onPress={handleSubmit(onSubmit)} />
      </View>
    </Sheet>
  );
}

/** Minimal react-hook-form wiring (validation is server-side; keep it light). */
function useFormLite(fields: FieldDef[]) {
  const { control, handleSubmit } = useForm({
    defaultValues: Object.fromEntries(fields.map((f) => [f.name, ''])),
  });
  return { control, handleSubmit };
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleWrap: {
    flexShrink: 1,
    gap: 2,
  },
  body: {
    flex: 1,
  },
  list: {
    gap: Spacing.three - 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.75,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three - 6,
    paddingBottom: Spacing.two,
  },
  footerBtn: {
    flex: 1,
  },
  form: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
