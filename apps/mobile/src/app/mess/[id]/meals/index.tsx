/**
 * Meals Calendar Screen
 * Shows monthly meal calendar with ON/OFF toggles
 */

import { use, useState, useCallback } from 'react';
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
import { useMealCalendar, useMealStats, useToggleMeal } from '@/features/mess/queries';
import type { MealType, MealState } from '@kse/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS: Record<MealType, string> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
};
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export default function MealsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [monthOffset, setMonthOffset] = useState(0);

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

  const today = new Date().toISOString().split('T')[0];

  const { data: calendar, isLoading, refetch, isRefetching } = useMealCalendar(id, monthStart, monthEnd);
  const { data: stats } = useMealStats(id, monthStart, monthEnd);
  const toggleMeal = useToggleMeal();

  const calendarMap = new Map(calendar?.map(c => [c.date, c]) ?? []);

  const handleToggle = async (date: string, mealType: MealType, currentState: MealState | null) => {
    const newState: MealState = currentState === 'on' ? 'off' : 'on';
    try {
      await toggleMeal.mutateAsync({
        mess_id: id,
        meal_date: date,
        meal_type: mealType,
        state: newState,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to update meal preference');
    }
  };

  const isPastDate = (dateStr: string) => dateStr < today;
  const isToday = (dateStr: string) => dateStr === today;

  const monthName = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build weeks for the month
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = lastDay;
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];

  // Pad start of first week
  for (let i = 0; i < firstDayOfWeek; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Month Navigation */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setMonthOffset(m => m - 1)} className="p-2">
            <Ionicons name="chevron-back" size={24} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">{monthName}</Text>
          <TouchableOpacity onPress={() => setMonthOffset(m => m + 1)} className="p-2">
            <Ionicons name="chevron-forward" size={24} />
          </TouchableOpacity>
        </View>

        {/* Month Stats */}
        {stats && (
          <Card>
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-2xl font-bold text-green-600">{stats.breakfast}</Text>
                <Text className="text-xs text-gray-500">Breakfast</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-blue-600">{stats.lunch}</Text>
                <Text className="text-xs text-gray-500">Lunch</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-purple-600">{stats.dinner}</Text>
                <Text className="text-xs text-gray-500">Dinner</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold">{stats.total}</Text>
                <Text className="text-xs text-gray-500">Total</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Calendar Grid */}
        <Card>
          {/* Weekday headers */}
          <View className="flex-row mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <View key={d} className="flex-1 items-center">
                <Text className="text-xs font-medium text-gray-500">{d}</Text>
              </View>
            ))}
          </View>

          {/* Weeks */}
          {isLoading ? (
            <ActivityIndicator className="py-8" />
          ) : (
            weeks.map((weekDays, wi) => (
              <View key={wi} className="flex-row mb-1">
                {weekDays.map((day, di) => {
                  if (day === null) {
                    return <View key={di} className="flex-1 h-12" />;
                  }
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const entry = calendarMap.get(dateStr);
                  const past = isPastDate(dateStr);
                  const today = isToday(dateStr);

                  return (
                    <TouchableOpacity
                      key={di}
                      className={`flex-1 h-12 items-center justify-center rounded-lg mx-0.5 ${
                        today ? 'bg-primary/10 border border-primary/30' : ''
                      }`}
                      disabled={past}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          past ? 'text-gray-300' : today ? 'text-primary' : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </Text>
                      {entry && (
                        <View className="flex-row gap-0.5 mt-0.5">
                          {MEAL_TYPES.map(mt => (
                            <View
                              key={mt}
                              className={`w-1.5 h-1.5 rounded-full ${
                                entry[mt] === 'on' ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </Card>

        {/* Legend */}
        <View className="flex-row items-center justify-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <View className="w-3 h-3 rounded-full bg-green-500" />
            <Text className="text-xs text-gray-500">Meal ON</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-3 h-3 rounded-full bg-gray-300" />
            <Text className="text-xs text-gray-500">Meal OFF</Text>
          </View>
        </View>

        {/* Day Detail - Tap to toggle */}
        <Card>
          <Text className="font-semibold mb-3">Tap to toggle meals</Text>
          <View className="gap-2">
            {MEAL_TYPES.map(mealType => (
              <View key={mealType} className="flex-row items-center gap-2">
                <Ionicons
                  name={MEAL_ICONS[mealType] as any}
                  size={20}
                  className="text-gray-500"
                />
                <Text className="flex-1">{MEAL_LABELS[mealType]}</Text>
                <Text className="text-xs text-gray-500">
                  {isPastDate(today) ? 'Past' : 'Today'}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
