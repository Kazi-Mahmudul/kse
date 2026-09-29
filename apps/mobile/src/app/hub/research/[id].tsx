import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Spacing, FontFamilies } from '@/constants/theme';
import { HubReportSheet } from '@/features/hub/components/report-sheet';
import { useMyResearchProfile, useResearchProfile, useSendResearchRequest } from '@/features/hub/queries';
import { alertDialog } from '@/lib/confirm';
import { useTheme } from '@/hooks/use-theme';
import { RESEARCH_COLLABORATION_LABELS } from '@kse/shared';

/** Research profile detail (spec student-hub §11) — request via in-app message. */
export default function ResearchProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const [requestVisible, setRequestVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [message, setMessage] = useState('');

  const { data: profile, isPending, isError, error, refetch } = useResearchProfile(id ?? '');
  const myProfile = useMyResearchProfile();
  const send = useSendResearchRequest();

  if (isPending) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackHeader title="Research profile" />
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Loading…
        </ThemedText>
      </Screen>
    );
  }

  if (isError || !profile) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackHeader title="Research profile" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load this profile"
          message={(error as Error)?.message ?? 'Please try again.'}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </Screen>
    );
  }

  const isOwn = myProfile.data?.id === profile.id;
  const canRequest = !isOwn && myProfile.data != null;

  const submitRequest = () => {
    send.mutate(
      { toProfileId: profile.id, message: message.trim() },
      {
        onSuccess: () => {
          setRequestVisible(false);
          setMessage('');
          void alertDialog({
            title: 'Request sent',
            message: 'They will be notified and can accept or decline in Research Partners.',
          });
        },
        onError: (err) => {
          void alertDialog({ title: 'Could not send', message: err.message });
        },
      },
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="Research profile" />

      <View style={styles.headRow}>
        <ProfileAvatar
          url={profile.profile?.avatar_url ?? null}
          name={profile.profile?.full_name ?? 'Student'}
          size={72}
        />
        <View style={styles.headBody}>
          <ThemedText type="title" style={styles.name}>
            {profile.profile?.full_name ?? 'Student'}
          </ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {profile.institution ?? 'Independent researcher'}
            {profile.district ? ` · ${profile.district}` : ''}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.interestCard, { borderColor: colors.primary }]}>
        <Ionicons name="flask-outline" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <ThemedText type="default" style={{ fontWeight: '700', color: colors.primary }}>
            {profile.research_interest}
          </ThemedText>
          {profile.topic ? (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {profile.topic}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {profile.bio ? (
        <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.two }}>
          {profile.bio}
        </ThemedText>
      ) : null}

      {profile.skills.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="smallBold">Skills</ThemedText>
          <View style={styles.pillWrap}>
            {profile.skills.map((s) => (
              <View key={s} style={[styles.pill, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {s}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="smallBold">Details</ThemedText>
        <View style={{ gap: 6 }}>
          {profile.discipline ? <Detail label="Discipline" value={profile.discipline} /> : null}
          <Detail
            label="Looking for"
            value={RESEARCH_COLLABORATION_LABELS[profile.collaboration_type]}
          />
          {profile.availability ? <Detail label="Availability" value={profile.availability} /> : null}
        </View>
      </View>

      {isOwn ? (
        <ThemedText type="small" style={{ color: colors.textMuted }}>
          This is your public research profile.
        </ThemedText>
      ) : (
        <View style={styles.actionRow}>
          <PrimaryButton
            label={canRequest ? 'Request to connect' : 'Create your profile to connect'}
            onPress={() => {
              if (canRequest) setRequestVisible(true);
            }}
            size="compact"
          />
          <PrimaryButton
            label="Report"
            variant="outline"
            onPress={() => setReportVisible(true)}
            size="compact"
          />
        </View>
      )}

      <Modal
        visible={requestVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRequestVisible(false)}
      >
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
          onPress={() => setRequestVisible(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <ThemedText type="default" style={{ fontWeight: '700' }}>
              Request to connect
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Introduce yourself and your research idea — they will be notified in-app.
            </ThemedText>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Hi, I am working on…"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                styles.messageInput,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.backgroundElement,
                },
              ]}
            />
            <PrimaryButton
              label={send.isPending ? 'Sending…' : 'Send request'}
              loading={send.isPending}
              disabled={message.trim().length < 10}
              onPress={submitRequest}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <HubReportSheet
        visible={reportVisible}
        targetType="research_profile"
        targetId={profile.id}
        onClose={() => setReportVisible(false)}
      />
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" style={{ color: colors.textMuted, width: 110 }}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={{ flex: 1, color: colors.text, fontWeight: '500' }}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  headBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 20,
  },
  interestCard: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: Spacing.two + 2,
  },
  section: {
    marginTop: Spacing.two + 2,
    gap: Spacing.one + 2,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    paddingTop: Spacing.one + 2,
    gap: Spacing.two + 2,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.two,
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: FontFamilies.regular,
    fontSize: 13,
  },
});
