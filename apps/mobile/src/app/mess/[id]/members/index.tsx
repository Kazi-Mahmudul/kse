/**
 * Members (spec §16): who's in the mess. Managers also get membership
 * controls — approve/reject join requests, remove members, hand over the
 * manager role, and see the invite code to share.
 */

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { alertChoice, alertConfirm, alertInfo } from '@/lib/dialogs';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { BackHeader } from '@/components/back-header';
import { Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useMessDetail,
  useMessMembers,
  useRemoveMember,
  useRespondJoinRequest,
  useTransferManager,
} from '@/features/mess/queries';
import { SectionLabel } from '@/features/mess/components/section-label';
import { MemberRow } from '@/features/mess/components/member-row';
import { ErrorBox, InlineLoading } from '@/features/mess/components/list-state';
import { useAuthStore } from '@/store/auth-store';
import type { MessMemberDetail } from '@kse/types';

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const messId = String(id ?? '');
  const currentUserId = useAuthStore((s) => s.session?.user?.id ?? null);

  const { data: members, isLoading, isError, error, refetch, isRefetching } = useMessMembers(messId);
  const { data: mess } = useMessDetail(messId);
  const respondJoin = useRespondJoinRequest();
  const removeMember = useRemoveMember();
  const transferManager = useTransferManager();

  const isManager = mess?.manager_id === currentUserId;

  const { active, pending } = useMemo(
    () => ({
      active: (members ?? []).filter((m) => m.status === 'active'),
      pending: (members ?? []).filter((m) => m.status === 'pending'),
    }),
    [members],
  );

  const handleRemove = (memberId: string, name: string) => {
    alertConfirm(
      'Remove member?',
      `${name} will lose access to the mess. This affects future data only — history stays.`,
      () =>
        removeMember.mutate(
          { memberId, messId },
          { onError: (e) => alertInfo('Could not remove', (e as Error).message) },
        ),
      { confirmLabel: 'Remove', destructive: true },
    );
  };

  const handleTransfer = (newManagerUserId: string, name: string) => {
    alertConfirm(
      'Make manager?',
      `${name} will manage this mess — meals, bazar, settlements and members. You become a regular member.`,
      () =>
        transferManager.mutate(
          { messId, newManagerId: newManagerUserId },
          {
            onSuccess: () => alertInfo('Manager transferred', `${name} now manages the mess.`),
            onError: (e) => alertInfo('Could not transfer', (e as Error).message),
          },
        ),
      { confirmLabel: 'Transfer' },
    );
  };

  /** Manager taps a member row → choose an action (native action sheet). */
  const openMemberActions = (member: MessMemberDetail) => {
    const name = member.user_name ?? 'This member';
    alertChoice(name, [
      { label: 'Make Manager', onPress: () => handleTransfer(member.user_id, name) },
      { label: 'Remove', destructive: true, onPress: () => handleRemove(member.id, name) },
    ]);
  };

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
      <BackHeader title="Mess Members" />

      {isLoading ? (
        <InlineLoading />
      ) : isError ? (
        <ErrorBox message={error?.message ?? 'Could not load members.'} onRetry={() => refetch()} />
      ) : (
        <View style={styles.body}>
          {/* Invite code — managers share this so others can join (§16) */}
          {isManager && mess ? (
            <View style={[styles.codeCard, { backgroundColor: `${colors.primary}0F`, borderColor: `${colors.primary}33` }]}>
              <View style={styles.codeText}>
                <ThemedText type="small" themeColor="textSecondary">
                  Mess code — share with housemates
                </ThemedText>
                <ThemedText type="subtitle" style={styles.code}>
                  {mess.code}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {active.length}/{mess.max_members} members
              </ThemedText>
            </View>
          ) : null}

          {/* Pending requests (manager) */}
          {pending.length > 0 ? (
            <>
              <SectionLabel>PENDING REQUESTS</SectionLabel>
              <View style={styles.list}>
                {pending.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    actionLabel={isManager ? 'Accept' : undefined}
                    onAction={
                      isManager
                        ? (member) =>
                            respondJoin.mutate(
                              { memberId: member.id, messId, action: 'accept' },
                              { onError: (e) => alertInfo('Could not accept', (e as Error).message) },
                            )
                        : undefined
                    }
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* Active members */}
          <SectionLabel>{`MEMBERS · ${active.length}`}</SectionLabel>
          {active.length === 0 ? (
            <EmptyState icon="people-outline" title="No active members" message="Approve join requests to build your mess." />
          ) : (
            <View style={styles.list}>
              {active.map((m) => {
                const isSelf = m.user_id === currentUserId;
                const rowIsManager = m.role === 'manager';
                return (
                  <MemberRow
                    key={m.id}
                    member={m}
                    onPress={
                      isManager && !isSelf && !rowIsManager
                        ? (member) => openMemberActions(member)
                        : undefined
                    }
                  />
                );
              })}
            </View>
          )}

          {/* Leave mess (member-initiated) */}
          {!isManager ? (
            <ThemedText
              type="small"
              themeColor="danger"
              onPress={() =>
                alertInfo(
                  'Leaving this mess',
                  'Only the manager can remove members. Ask your mess manager to remove you — your history stays intact.'
                )
              }
              style={styles.leave}
            >
              Leave this mess
            </ThemedText>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three - 6,
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
  },
  codeText: {
    gap: 2,
  },
  code: {
    fontSize: 20,
    lineHeight: 28,
  },
  list: {
    gap: Spacing.three - 6,
  },
  leave: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
});
