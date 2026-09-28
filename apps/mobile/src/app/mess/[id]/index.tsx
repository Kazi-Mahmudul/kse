/**
 * Mess Dashboard — Member View
 * Shows today's meals, balance, bazar duty, and quick actions
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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useMemberDashboard, useMessDetail, useToggleMeal, useLeaveMess } from '@/features/mess/queries';
import { paisaToBdt } from '@kse/types';
import type { MealType } from '@kse/types';

const MEAL_ICONS: Record<string, string> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export default function MessDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: dashboard, isLoading, refetch, isRefetching } = useMemberDashboard(id);
  const { data: mess } = useMessDetail(id);
  const toggleMeal = useToggleMeal();
  const leaveMess = useLeaveMess();

  const today = new Date().toISOString().split('T')[0];

  const handleToggleMeal = async (mealType: MealType, currentState: 'on' | 'off') => {
    const newState = currentState === 'on' ? 'off' : 'on';
    try {
      await toggleMeal.mutateAsync({
        mess_id: id,
        meal_date: today,
        meal_type: mealType,
        state: newState,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to update meal preference');
    }
  };

  const handleLeaveMess = () => {
    const member = dashboard?.mess;
    if (!member) return;
    Alert.alert(
      'Leave Mess',
      `Are you sure you want to leave "${dashboard.mess.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveMess.mutateAsync({ messId: id, memberId: '' });
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Failed to leave mess');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  if (!dashboard) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Failed to load mess data</Text>
          <PrimaryButton label="Retry" onPress={() => refetch()} className="mt-4" />
        </View>
      </Screen>
    );
  }

  const { today_meals, current_month_meals, my_next_duty, my_bazar_contribution, current_meal_rate, announcements } = dashboard;

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Mess Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold">{mess?.name}</Text>
            {mess?.location && (
              <Text className="text-sm text-gray-500 mt-1">{mess.location}</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleLeaveMess} className="p-2">
            <Ionicons name="exit-outline" size={22} className="text-red-500" />
          </TouchableOpacity>
        </View>

        {/* Announcements Banner */}
        {announcements.length > 0 && (
          <Card className="bg-yellow-50 border-l-4 border-l-yellow-500">
            <View className="flex-row items-start gap-2">
              <Ionicons name="megaphone" size={20} className="text-yellow-600 mt-0.5" />
              <View className="flex-1">
                {announcements.slice(0, 1).map(a => (
                  <View key={a.id}>
                    <Text className="font-medium">{a.title}</Text>
                    <Text className="text-sm text-gray-600 mt-1">{a.content}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        )}

	        {/* Today's Meals Card */}
	        <Card>
	          <Text className="font-semibold text-lg mb-4">Today&apos;s Meals</Text>
          <View className="gap-3">
            {(Object.keys(MEAL_LABELS) as MealType[]).map(mealType => {
              const isOn = today_meals[mealType] === 'on';
              return (
                <View key={mealType} className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Ionicons
                      name={MEAL_ICONS[mealType] as any}
                      size={24}
                      className={isOn ? 'text-green-600' : 'text-gray-400'}
                    />
                    <Text className={isOn ? 'font-medium' : 'text-gray-500'}>
                      {MEAL_LABELS[mealType]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleMeal(mealType, isOn ? 'on' : 'off')}
                    disabled={toggleMeal.isPending}
                    className={`px-4 py-2 rounded-full ${
                      isOn ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        isOn ? 'text-green-700' : 'text-gray-500'
                      }`}
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Quick Stats */}
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Text className="text-sm text-gray-500">This Month</Text>
            <Text className="text-2xl font-bold mt-1">{current_month_meals}</Text>
            <Text className="text-xs text-gray-500">meals</Text>
          </Card>
          <Card className="flex-1">
            <Text className="text-sm text-gray-500">Meal Rate</Text>
            <Text className="text-2xl font-bold mt-1">
              {paisaToBdt(current_meal_rate)}
            </Text>
            <Text className="text-xs text-gray-500">per meal</Text>
          </Card>
        </View>

        {/* My Bazar Contribution */}
        <TouchableOpacity onPress={() => router.push({ pathname: '/mess/[id]/bazar', params: { id: String(id) } } as any)}>
          <Card>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-gray-500">My Bazar</Text>
                <Text className="text-xl font-bold mt-1">
                  {paisaToBdt(my_bazar_contribution)}
                </Text>
                <Text className="text-xs text-gray-500">this month</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} className="text-gray-400" />
            </View>
          </Card>
        </TouchableOpacity>

        {/* My Bazar Duty */}
        <TouchableOpacity onPress={() => router.push({ pathname: '/mess/[id]/duty', params: { id: String(id) } } as any)}>
          <Card>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-gray-500">My Next Duty</Text>
                {my_next_duty ? (
                  <>
                    <Text className="text-xl font-bold mt-1">
                      {new Date(my_next_duty.duty_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    <Text className="text-xs text-orange-500 mt-1">Upcoming</Text>
                  </>
                ) : (
                  <Text className="text-lg font-medium mt-1 text-gray-400">
                    No upcoming duty
                  </Text>
                )}
              </View>
              {my_next_duty && (
                <View className="px-3 py-1.5 bg-orange-100 rounded-full">
                  <Text className="text-sm font-medium text-orange-700">Exchange</Text>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View className="gap-2">
          <Text className="font-semibold text-lg">Quick Actions</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push({ pathname: '/mess/[id]/meals', params: { id: String(id) } } as any)}
            >
              <Card className="items-center py-4">
                <Ionicons name="calendar-outline" size={28} className="text-primary" />
                <Text className="text-sm font-medium mt-2">Meals</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push({ pathname: '/mess/[id]/bazar', params: { id: String(id) } } as any)}
            >
              <Card className="items-center py-4">
                <Ionicons name="cart-outline" size={28} className="text-primary" />
                <Text className="text-sm font-medium mt-2">Bazar</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push({ pathname: '/mess/[id]/finance', params: { id: String(id) } } as any)}
            >
              <Card className="items-center py-4">
                <Ionicons name="wallet-outline" size={28} className="text-primary" />
                <Text className="text-sm font-medium mt-2">Finance</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push({ pathname: '/mess/[id]/members', params: { id: String(id) } } as any)}
            >
              <Card className="items-center py-4">
                <Ionicons name="people-outline" size={28} className="text-primary" />
                <Text className="text-sm font-medium mt-2">Members</Text>
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Balance */}
        <TouchableOpacity onPress={() => router.push({ pathname: '/mess/[id]/settlement', params: { id: String(id) } } as any)}>
          <Card className="bg-primary/5 border border-primary/20">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-gray-500">My Balance</Text>
                <Text className="text-2xl font-bold mt-1">
                  {paisaToBdt(Math.abs(dashboard.my_balance))}
                </Text>
                <Text
                  className={`text-xs font-medium ${
                    dashboard.my_balance_type === 'due'
                      ? 'text-red-600'
                      : dashboard.my_balance_type === 'receivable'
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {dashboard.my_balance_type === 'due'
                    ? 'Amount Due'
                    : dashboard.my_balance_type === 'receivable'
                    ? 'Receivable'
                    : 'Settled'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} className="text-gray-400" />
            </View>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
