/**
 * Bazar Screen — View bazar purchases and add new entries
 */

import { use, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { EmptyState } from '@/components/ui/empty-state';
import { useBazarPurchases, useAddBazarPurchase } from '@/features/mess/queries';
import { paisaToBdt } from '@kse/types';

export default function BazarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [monthOffset, setMonthOffset] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

  const { data: purchases, isLoading, refetch, isRefetching } = useBazarPurchases(id, monthStart, monthEnd);
  const addPurchase = useAddBazarPurchase();

  const totalBazar = purchases?.reduce((sum, p) => sum + p.total_amount, 0) ?? 0;
  const monthName = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Group purchases by date
  const byDate = new Map<string, typeof purchases>();
  for (const p of purchases ?? []) {
    if (!byDate.has(p.purchase_date)) byDate.set(p.purchase_date, []);
    byDate.get(p.purchase_date)!.push(p);
  }

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setMonthOffset(m => m - 1)} className="p-2 -ml-2">
            <Ionicons name="chevron-back" size={24} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">{monthName}</Text>
          <TouchableOpacity onPress={() => setMonthOffset(m => m + 1)} className="p-2 -ml-2">
            <Ionicons name="chevron-forward" size={24} />
          </TouchableOpacity>
        </View>

        {/* Total Bazar Card */}
        <Card className="bg-green-50">
          <Text className="text-sm text-gray-500">Total Bazar This Month</Text>
          <Text className="text-3xl font-bold text-green-700 mt-1">
            {paisaToBdt(totalBazar)}
          </Text>
        </Card>

        {/* Add Purchase Button */}
        <PrimaryButton
          label="Add Bazar Entry"
          onPress={() => setShowAddForm(true)}
        />

        {/* Purchases List */}
        {isLoading ? (
          <ActivityIndicator className="py-8" />
        ) : purchases?.length === 0 ? (
          <EmptyState
            icon="cart-outline"
            title="No Bazar Entries"
            message="Add your first bazar purchase for this month"
          />
        ) : (
          Array.from(byDate.entries())
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dayPurchases]) => (
              <View key={date}>
                <Text className="font-medium text-sm text-gray-500 mb-2">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
                {(dayPurchases ?? []).map(purchase => (
                  <TouchableOpacity key={purchase.id}>
                    <Card className="mb-2">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                            <Ionicons name="person-outline" size={20} className="text-blue-600" />
                          </View>
                          <View>
                            <Text className="font-medium">
                              {purchase.buyer_name ?? 'Unknown'}
                            </Text>
                            <Text className="text-sm text-gray-500">
                              {purchase.items?.length ?? 0} items
                            </Text>
                          </View>
                        </View>
                        <Text className="font-semibold text-green-700">
                          {paisaToBdt(purchase.total_amount)}
                        </Text>
                      </View>
                      {purchase.items && purchase.items.length > 0 && (
                        <View className="mt-3 pt-3 border-t border-gray-100">
                          {purchase.items.slice(0, 3).map(item => (
                            <View key={item.id} className="flex-row justify-between text-sm mb-1">
                              <Text className="text-gray-600">{item.item_name}</Text>
                              <Text className="text-gray-500">
                                {item.quantity} {item.unit} × {paisaToBdt(item.unit_price)}
                              </Text>
                            </View>
                          ))}
                          {purchase.items.length > 3 && (
                            <Text className="text-xs text-gray-400 mt-1">
                              +{purchase.items.length - 3} more items
                            </Text>
                          )}
                        </View>
                      )}
                      {purchase.notes && (
                        <Text className="text-xs text-gray-400 mt-2 italic">
                          {purchase.notes}
                        </Text>
                      )}
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ))
        )}
      </ScrollView>
    </Screen>
  );
}
