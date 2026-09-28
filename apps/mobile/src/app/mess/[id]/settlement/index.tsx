/**
 * Settlement Screen — View monthly settlement with transparent breakdown
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { useSettlement, useGenerateSettlement } from '@/features/mess/queries';
import { paisaToBdt } from '@kse/types';

export default function SettlementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [monthOffset, setMonthOffset] = useState(0);

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset - 1); // Default to previous month
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

  const { data: settlement, isLoading, refetch, isRefetching } = useSettlement(id, monthStart);
  const generateSettlement = useGenerateSettlement();

  const monthName = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleGenerate = async () => {
    try {
      await generateSettlement.mutateAsync({
        messId: id,
        monthStart,
        monthEnd,
      });
    } catch (e) {
      // Error handled in mutation
    }
  };

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Month Navigation */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setMonthOffset(m => m - 1)} className="p-2 -ml-2">
            <Ionicons name="chevron-back" size={24} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">{monthName}</Text>
          <TouchableOpacity onPress={() => setMonthOffset(m => m + 1)} className="p-2 -ml-2">
            <Ionicons name="chevron-forward" size={24} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator className="py-8" />
        ) : !settlement ? (
          <Card className="py-8 items-center">
            <Ionicons name="document-text-outline" size={48} className="text-gray-300" />
            <Text className="text-gray-500 mt-3 text-center">
              No settlement available for {monthName}
            </Text>
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={generateSettlement.isPending}
              className="mt-4"
            >
              <View className="px-4 py-2 bg-primary rounded-lg">
                <Text className="text-white font-medium">
                  {generateSettlement.isPending ? 'Generating...' : 'Generate Settlement'}
                </Text>
              </View>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            {/* Settlement Summary */}
            <Card className="bg-primary/5 border border-primary/20">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-sm text-gray-500">Meal Rate</Text>
                  <Text className="text-2xl font-bold text-primary">
                    {paisaToBdt(settlement.meal_rate)}/meal
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${
                    settlement.status === 'locked'
                      ? 'bg-gray-200'
                      : settlement.status === 'published'
                      ? 'bg-green-100'
                      : 'bg-yellow-100'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium capitalize ${
                      settlement.status === 'locked'
                        ? 'text-gray-600'
                        : settlement.status === 'published'
                        ? 'text-green-700'
                        : 'text-yellow-700'
                    }`}
                  >
                    {settlement.status}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-sm text-gray-500">Total Meals</Text>
                  <Text className="font-semibold">{settlement.total_meals}</Text>
                </View>
                <View>
                  <Text className="text-sm text-gray-500">Total Cost</Text>
                  <Text className="font-semibold">{paisaToBdt(settlement.total_meal_cost)}</Text>
                </View>
              </View>
            </Card>

            {/* Member Breakdown */}
            <Text className="font-semibold text-lg">Member Breakdown</Text>
            {settlement.items?.map(item => (
              <Card key={item.id} className="mb-3">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                      <Text className="font-medium text-primary">
                        {item.member?.full_name?.charAt(0) ?? '?'}
                      </Text>
                    </View>
                    <Text className="font-medium">
                      {item.member?.full_name ?? 'Unknown'}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${
                      item.balance_type === 'due'
                        ? 'bg-red-100'
                        : item.balance_type === 'receivable'
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        item.balance_type === 'due'
                          ? 'text-red-700'
                          : item.balance_type === 'receivable'
                          ? 'text-green-700'
                          : 'text-gray-700'
                      }`}
                    >
                      {item.balance_type === 'due'
                        ? `Due ${paisaToBdt(item.balance)}`
                        : item.balance_type === 'receivable'
                        ? `Receivable ${paisaToBdt(Math.abs(item.balance))}`
                        : 'Settled'}
                    </Text>
                  </View>
                </View>

                {/* Transparent Breakdown */}
                <View className="gap-1">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-500">
                      Meals: {item.total_meals} × {paisaToBdt(settlement.meal_rate)}
                    </Text>
                    <Text className="text-sm">{paisaToBdt(item.meal_cost)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-500">Bazar Contribution</Text>
                    <Text className="text-sm">{paisaToBdt(item.bazar_contribution)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-500">Shared Expenses</Text>
                    <Text className="text-sm">{paisaToBdt(item.shared_expense_share)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-500">Payments</Text>
                    <Text className="text-sm text-green-600">
                      -{paisaToBdt(item.total_payments)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between border-t border-gray-200 pt-2 mt-2">
                    <Text className="font-medium">Total Cost</Text>
                    <Text className="font-semibold">{paisaToBdt(item.total_cost)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
