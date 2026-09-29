import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { HubReportSheet } from '@/features/hub/components/report-sheet';
import { useBookListing, useContactBookOwner } from '@/features/hub/queries';
import { alertDialog } from '@/lib/confirm';
import { useTheme } from '@/hooks/use-theme';
import { BOOK_CONDITION_LABELS, BOOK_INTENT_LABELS, BOOK_STATUS_LABELS } from '@kse/shared';

/** Book listing detail (spec student-hub §10) — contact is routed by the owner's preference. */
export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const [reportVisible, setReportVisible] = useState(false);
  const contact = useContactBookOwner();

  const { data: book, isPending, isError, error, refetch } = useBookListing(id ?? '');

  if (isPending) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackHeader title="Book" />
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Loading…
        </ThemedText>
      </Screen>
    );
  }

  if (isError || !book) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackHeader title="Book" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load this book"
          message={(error as Error)?.message ?? 'Please try again.'}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </Screen>
    );
  }

  const isActive = book.status === 'active';
  const showPhone = book.contact_preference === 'phone' && Boolean(book.phone);

  const onContact = () => {
    contact.mutate(
      { bookId: book.id, message: `Hi, I am interested in "${book.title}".` },
      {
        onSuccess: () => {
          void alertDialog({
            title: 'Message sent',
            message: showPhone
              ? `The owner will reach you in-app. You can also call ${book.phone}.`
              : 'The owner will get back to you in-app shortly.',
          });
        },
        onError: (err) => {
          void alertDialog({ title: 'Could not send', message: err.message });
        },
      },
    );
  };

  const onCall = () => {
    const phone = book.phone?.replace(/[^\d+]/g, '');
    if (!phone) return;
    void Linking.openURL(`tel:${phone}`).catch(() => {
      void alertDialog({ title: 'Could not open the dialer', message: phone });
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackHeader title="Book Exchange" />

      {book.image_urls.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
        >
          {book.image_urls.map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.photo} contentFit="cover" transition={150} />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.headRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="title" style={styles.title}>
            {book.title}
          </ThemedText>
          {book.author ? (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              by {book.author}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.intentPill, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={{ color: colors.primary, fontWeight: '700' }}>
            {BOOK_INTENT_LABELS[book.intent]}
          </ThemedText>
        </View>
      </View>

      <View style={styles.chipRow}>
        <Pill label={BOOK_CONDITION_LABELS[book.condition]} />
        {book.edition ? <Pill label={`${book.edition} edition`} /> : null}
        {book.subject ? <Pill label={book.subject} /> : null}
        {book.status !== 'active' ? (
          <View style={[styles.pill, { backgroundColor: `${colors.warning}33` }]}>
            <ThemedText type="small" style={{ color: colors.warning, fontWeight: '600' }}>
              {BOOK_STATUS_LABELS[book.status]}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {book.intent === 'sell' && book.price != null ? (
        <View style={[styles.priceCard, { borderColor: colors.primary }]}>
          <Ionicons name="cash-outline" size={18} color={colors.primary} />
          <ThemedText type="default" style={{ fontWeight: '700', color: colors.primary }}>
            BDT {(book.price / 100).toLocaleString('en-IN')}
          </ThemedText>
        </View>
      ) : null}

      {book.description ? (
        <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.two }}>
          {book.description}
        </ThemedText>
      ) : null}

      {book.intent === 'exchange' && book.expected_exchange ? (
        <View style={{ marginTop: Spacing.two }}>
          <ThemedText type="smallBold">Looking for</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {book.expected_exchange}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.ownerRow}>
        <Ionicons name="person-outline" size={15} color={colors.textSecondary} />
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Posted by {book.owner?.full_name ?? book.owner_name ?? 'a student'}
        </ThemedText>
      </View>

      <View style={styles.actionRow}>
        {isActive ? (
          <>
            <PrimaryButton
              label={contact.isPending ? 'Sending…' : 'Contact owner'}
              onPress={onContact}
              loading={contact.isPending}
              size="compact"
            />
            {showPhone ? (
              <PrimaryButton label="Call" variant="outline" onPress={onCall} size="compact" />
            ) : null}
          </>
        ) : (
          <ThemedText type="small" style={{ color: colors.textMuted }}>
            This listing is {BOOK_STATUS_LABELS[book.status].toLowerCase()} — contact is closed.
          </ThemedText>
        )}
        <PrimaryButton
          label="Report"
          variant="outline"
          onPress={() => setReportVisible(true)}
          size="compact"
        />
      </View>

      <HubReportSheet
        visible={reportVisible}
        targetType="book_listing"
        targetId={book.id}
        onClose={() => setReportVisible(false)}
      />
    </Screen>
  );
}

function Pill({ label }: { label: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="small" style={{ color: colors.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  photo: {
    width: 150,
    height: 200,
    borderRadius: 12,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginTop: Spacing.one + 2,
  },
  title: {
    fontSize: 20,
  },
  intentPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.two,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: 'flex-start',
    marginTop: Spacing.two + 2,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.three,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
});
