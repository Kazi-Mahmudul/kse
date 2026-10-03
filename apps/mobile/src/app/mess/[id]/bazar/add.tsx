/**
 * Add Bazar — mobile-first purchase form (spec §10–§11).
 * Items are added through a quick bottom sheet (item, quantity, unit,
 * price) so recording a shopping trip never leaves this screen.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { alertInfo } from '@/lib/dialogs';

import { ThemedText } from '@/components/themed-text';
import { BackHeader } from '@/components/back-header';
import { Screen } from '@/components/ui/screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { InputField } from '@/features/mess/components/input-field';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAddBazarPurchase } from '@/features/mess/queries';
import { Sheet } from '@/features/mess/components/sheet';
import { SectionLabel } from '@/features/mess/components/section-label';
import { dhakaToday, formatDayMonth } from '@/features/mess/lib/dates';
import { bdtToPaisa, paisaToBdtCompact } from '@kse/types';
import type { BazarCategory } from '@kse/types';

interface DraftItem {
  key: string;
  item_name: string;
  quantity: number;
  unit: string;
  /** Total paid for the line, in paisa (user enters the item total, not per-unit). */
  line_total: number;
  category: BazarCategory;
}

const CATEGORIES: { value: BazarCategory; label: string }[] = [
  { value: 'rice', label: 'Rice' },
  { value: 'fish', label: 'Fish' },
  { value: 'meat', label: 'Meat' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'oil', label: 'Oil' },
  { value: 'spices', label: 'Spices' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'milk', label: 'Milk' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

const UNITS = ['kg', 'g', 'litre', 'pcs', 'dozen', 'packet', 'bundle'];

export default function AddBazarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const messId = String(id ?? '');

  const addPurchase = useAddBazarPurchase();

  const [date] = useState(dhakaToday());
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const totalPaisa = items.reduce((sum, i) => sum + i.line_total, 0);

  const save = () => {
    if (items.length === 0) {
      alertInfo('Add at least one item', 'Use “Add Item” to list what you bought.');
      return;
    }
    addPurchase.mutate(
      {
        mess_id: messId,
        purchase_date: date,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          item_name: i.item_name,
          quantity: i.quantity,
          unit: i.unit,
          // The DB stores per-unit paisa and derives the line total
          // (quantity × unit_price) by trigger; the member enters the
          // line total, so divide it back out.
          unit_price: Math.round(i.line_total / (i.quantity || 1)),
          category: i.category,
        })),
      },
      {
        onSuccess: () => {
          alertInfo('Bazar saved', `${items.length} item${items.length === 1 ? '' : 's'} recorded for ${formatDayMonth(date)}.`);
          router.back();
        },
        onError: (e) => alertInfo('Could not save', (e as Error).message),
      },
    );
  };

  return (
    <Screen scroll={false}>
      <BackHeader title="Add Bazar" />

      <View style={styles.form}>
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <ThemedText style={styles.fieldLabel}>Date</ThemedText>
            <TextInputLike value={formatDayMonth(date)} onPress={() => { /* keep today; simple by design */ }} />
          </View>
          <View style={styles.fieldHalf}>
            <ThemedText style={styles.fieldLabel}>Buyer</ThemedText>
            <TextInputLike value="You" muted />
          </View>
        </View>

        {/* Items (spec §10) */}
        <SectionLabel>ITEMS</SectionLabel>
        {items.length === 0 ? (
          <View style={[styles.emptyItems, { borderColor: colors.border }]}>
            <Ionicons name="basket-outline" size={22} color={colors.textMuted} />
            <ThemedText type="small" themeColor="textSecondary">
              No items yet — add what you bought
            </ThemedText>
          </View>
        ) : (
          <View style={styles.itemList}>
            {items.map((item) => (
              <View key={item.key} style={[styles.itemRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.itemMeta}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {item.item_name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.quantity} {item.unit} · {paisaToBdtCompact(item.line_total)}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => setItems((list) => list.filter((i) => i.key !== item.key))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.item_name}`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <PrimaryButton label="+ Add Item" variant="outline" onPress={() => setSheetOpen(true)} />

        {/* Total (spec §10) */}
        <View style={[styles.totalRow, { borderColor: colors.border }]}>
          <ThemedText type="smallBold">Total</ThemedText>
          <ThemedText style={[styles.totalValue, { color: colors.success }]}>
            {paisaToBdtCompact(totalPaisa)}
          </ThemedText>
        </View>

        {/* Optional notes (spec §10) */}
        <InputField
          value={notes}
          onChangeText={setNotes}
          label="Notes (optional)"
          placeholder="e.g. weekly bazar from Boyra market"
          multiline
        />

        <PrimaryButton
          label={items.length === 0 ? 'Save Bazar' : `Save Bazar · ${paisaToBdtCompact(totalPaisa)}`}
          loading={addPurchase.isPending}
          onPress={save}
        />
      </View>

      {/* Quick add item sheet (spec §11) */}
      <QuickAddItemSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={(item) => {
          setItems((list) => [...list, item]);
          setSheetOpen(false);
        }}
      />
    </Screen>
  );
}

// ── Quick add sheet (spec §11) ───────────────────────────────────────────────

function QuickAddItemSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: DraftItem) => void;
}) {
  const colors = useTheme();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<BazarCategory>('grocery');

  const reset = () => {
    setName('');
    setQuantity('1');
    setUnit('kg');
    setPrice('');
    setCategory('grocery');
  };

  const add = () => {
    const qty = parseFloat(quantity.replace(',', '.')) || 0;
    const linePaisa = bdtToPaisa(price);
    if (!name.trim() || linePaisa <= 0) {
      alertInfo('Item needs a name and a price');
      return;
    }
    onAdd({
      key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      item_name: name.trim(),
      quantity: qty > 0 ? qty : 1,
      unit,
      line_total: linePaisa,
      category,
    });
    reset();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Add Item">
      <View style={styles.sheetForm}>
        <InputField value={name} onChangeText={setName} label="Item" placeholder="e.g. Rice" />

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <InputField
              value={quantity}
              onChangeText={setQuantity}
              label="Quantity"
              keyboardType="decimal-pad"
              placeholder="10"
            />
          </View>
          <View style={styles.fieldHalf}>
            <ThemedText style={styles.fieldLabel}>Unit</ThemedText>
            <View style={styles.unitRow}>
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUnit(u)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: unit === u }}
                  style={({ pressed }) => [
                    styles.unitChip,
                    unit === u
                      ? { backgroundColor: `${colors.primary}1A`, borderColor: colors.primary }
                      : { borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="small" style={{ color: unit === u ? colors.primary : colors.textSecondary }}>
                    {u}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <InputField
          value={price}
          onChangeText={setPrice}
          label="Price (৳) — total for this item"
          keyboardType="decimal-pad"
          placeholder="800"
        />

        <ThemedText style={styles.fieldLabel}>Category</ThemedText>
        <View style={styles.categoryWrap}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: category === c.value }}
              style={({ pressed }) => [
                styles.categoryChip,
                category === c.value
                  ? { backgroundColor: `${colors.primary}1A`, borderColor: colors.primary }
                  : { borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="small" style={{ color: category === c.value ? colors.primary : colors.textSecondary }}>
                {c.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <PrimaryButton label="Add" onPress={add} style={styles.sheetAdd} />
      </View>
    </Sheet>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function TextInputLike({ value, muted, onPress }: { value: string; muted?: boolean; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.inputLike, { backgroundColor: colors.backgroundElement }]}
      accessibilityLabel={value}
    >
      <ThemedText style={{ color: muted ? colors.textSecondary : colors.text }}>{value}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.three - 6,
  },
  fieldHalf: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputLike: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emptyItems: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: 'dashed',
    paddingVertical: Spacing.four,
  },
  itemList: {
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three - 4,
  },
  itemMeta: {
    flex: 1,
    gap: 1,
  },
  remove: {
    padding: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three - 4,
  },
  totalValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  sheetForm: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unitChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sheetAdd: {
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
