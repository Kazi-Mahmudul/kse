/**
 * Bazar Duty Screen — View duties and request exchanges
 */

import { useState } from 'react';
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
import { EmptyState } from '@/components/ui/empty-state';
import { useBazarDuties, useMyNextDuty, usePendingExchanges, useRespondExchange } from '@/features/mess/queries';

export default function DutyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [monthOffset, setMonthOffset] = useState(0);

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

  const { data: duties, isLoading, refetch, isRefetching } = useBazarDuties(id, monthStart, monthEnd);
  const { data: nextDuty } = useMyNextDuty(id);
  const { data: pendingExchanges } = usePendingExchanges(id);
  const respondExchange = useRespondExchange();

  const monthName = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Group duties by date
  const byDate = new Map<string, typeof duties>();
  for (const d of duties ?? []) {
    if (!byDate.has(d.duty_date)) byDate.set(d.duty_date, []);
    byDate.get(d.duty_date)!.push(d);
  }

  const handleExchangeResponse = async (exchangeId: string, action: 'accept' | 'reject') => {
    try {
      await respondExchange.mutateAsync({ exchangeId, action });
    } catch (e) {
      Alert.alert('Error', 'Failed to respond to exchange request');
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

        {/* My Next Duty */}
        {nextDuty && (
          <Card className="bg-orange-50 border-l-4 border-l-orange-500">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-gray-500">My Next Duty</Text>
                <Text className="text-xl font-bold mt-1">
                  {new Date(nextDuty.duty_date + 'T00:00:00').toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
              </View>
              <TouchableOpacity className="px-4 py-2 bg-orange-500 rounded-full">
                <Text className="text-white font-medium">Exchange</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Pending Exchange Requests */}
        {pendingExchanges && pendingExchanges.length > 0 && (
          <View>
            <Text className="font-semibold text-lg mb-3">Exchange Requests</Text>
            {pendingExchanges.map(exchange => (
              <Card key={exchange.id} className="mb-2 border-l-4 border-l-blue-500">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-medium">
                      {exchange.requester_name ?? 'Unknown'}
                    </Text>
                    <Text className="text-gray-400">wants to swap with</Text>
                    <Text className="font-medium">
                      {exchange.target_name ?? 'Unknown'}
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between text-sm text-gray-500 mb-3">
                  <Text>
                    {new Date(exchange.requester_duty_date + 'T00:00:00').toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Ionicons name="swap-horizontal" size={16} />
                  <Text>
                    {new Date(exchange.target_duty_date + 'T00:00:00').toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                {exchange.target_id === exchange.requester_id ? null : (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="flex-1 py-2 bg-green-500 rounded-lg"
                      onPress={() => handleExchangeResponse(exchange.id, 'accept')}
                      disabled={respondExchange.isPending}
                    >
                      <Text className="text-white text-center font-medium">Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 py-2 bg-gray-200 rounded-lg"
                      onPress={() => handleExchangeResponse(exchange.id, 'reject')}
                      disabled={respondExchange.isPending}
                    >
                      <Text className="text-gray-700 text-center font-medium">Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}

        {/* Duty Schedule */}
        <View>
          <Text className="font-semibold text-lg mb-3">Duty Schedule</Text>
          {isLoading ? (
            <ActivityIndicator className="py-8" />
          ) : duties?.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No Duties Scheduled"
              message="No bazar duties scheduled for this month"
            />
          ) : (
            Array.from(byDate.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dateDuties]) => (
                <View key={date} className="mb-3">
                  <Text className="text-sm font-medium text-gray-500 mb-2">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  {(dateDuties ?? []).map(duty => (
                    <Card key={duty.id} className="mb-1">
                      <View className="flex-row items-center gap-3">
                        <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center">
                          <Ionicons name="person-outline" size={16} className="text-orange-600" />
                        </View>
                        <Text className="font-medium">
                          {duty.user?.full_name ?? 'Unknown'}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
