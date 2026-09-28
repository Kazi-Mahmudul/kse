/**
 * Finance Screen — View expenses, payments, and balance
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
import { PrimaryButton } from '@/components/ui/primary-button';
import { useMessExpenses, useMessPayments } from '@/features/mess/queries';
import { paisaToBdt } from '@kse/types';

const EXPENSE_CATEGORY_ICONS: Record<string, string> = {
  rent: 'home-outline',
  gas: 'flame-outline',
  electricity: 'flash-outline',
  water: 'water-outline',
  wifi: 'wifi-outline',
  cleaning: 'sparkles-outline',
  maintenance: 'construct-outline',
  furniture: 'bed-outline',
  other: 'ellipsis-horizontal-outline',
};

export default function FinanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'expenses' | 'payments'>('expenses');

  const { data: expenses, isLoading: expensesLoading, refetch: refetchExpenses, isRefetching: expensesRefetching } =
    useMessExpenses(id, '2024-01-01', '2030-12-31'); // Get all for now
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments, isRefetching: paymentsRefetching } =
    useMessPayments(id);

  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const totalPayments = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={activeTab === 'expenses' ? expensesRefetching : paymentsRefetching}
            onRefresh={activeTab === 'expenses' ? refetchExpenses : refetchPayments}
          />
        }
      >
        {/* Summary Cards */}
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Text className="text-sm text-gray-500">Total Expenses</Text>
            <Text className="text-2xl font-bold text-red-600 mt-1">
              {paisaToBdt(totalExpenses)}
            </Text>
          </Card>
          <Card className="flex-1">
            <Text className="text-sm text-gray-500">Total Payments</Text>
            <Text className="text-2xl font-bold text-green-600 mt-1">
              {paisaToBdt(totalPayments)}
            </Text>
          </Card>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          {(['expenses', 'payments'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2 rounded-md ${
                activeTab === tab ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === tab ? 'text-primary' : 'text-gray-500'
                }`}
              >
                {tab === 'expenses' ? 'Expenses' : 'Payments'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === 'expenses' ? (
          expensesLoading ? (
            <ActivityIndicator className="py-8" />
          ) : expenses?.length === 0 ? (
            <Card className="py-8 items-center">
              <Ionicons name="receipt-outline" size={40} className="text-gray-300" />
              <Text className="text-gray-500 mt-2">No expenses recorded</Text>
            </Card>
          ) : (
            expenses?.map(expense => (
              <Card key={expense.id} className="mb-2">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center">
                    <Ionicons
                      name={(EXPENSE_CATEGORY_ICONS[expense.category] as any) ?? 'receipt-outline'}
                      size={20}
                      className="text-red-600"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium capitalize">{expense.category}</Text>
                    {expense.description && (
                      <Text className="text-sm text-gray-500">{expense.description}</Text>
                    )}
                    <Text className="text-xs text-gray-400 mt-1">
                      {new Date(expense.expense_date + 'T00:00:00').toLocaleDateString('en-GB')}
                      {' • '}
                      {expense.paid_by_profile?.full_name ?? 'Unknown'}
                    </Text>
                  </View>
                  <Text className="font-semibold text-red-600">
                    {paisaToBdt(expense.amount)}
                  </Text>
                </View>
              </Card>
            ))
          )
        ) : paymentsLoading ? (
          <ActivityIndicator className="py-8" />
        ) : payments?.length === 0 ? (
          <Card className="py-8 items-center">
            <Ionicons name="cash-outline" size={40} className="text-gray-300" />
            <Text className="text-gray-500 mt-2">No payments recorded</Text>
          </Card>
        ) : (
          payments?.map(payment => (
            <Card key={payment.id} className="mb-2">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center">
                  <Ionicons
                    name={
                      payment.payment_method === 'cash'
                        ? 'cash-outline'
                        : payment.payment_method === 'bank'
                        ? 'card-outline'
                        : 'phone-portrait-outline'
                    }
                    size={20}
                    className="text-green-600"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-medium">{payment.member?.full_name ?? 'Unknown'}</Text>
                  <Text className="text-sm text-gray-500 capitalize">
                    {payment.payment_method.replace('_', ' ')}
                    {payment.reference && ` • ${payment.reference}`}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    {new Date(payment.payment_date + 'T00:00:00').toLocaleDateString('en-GB')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-semibold text-green-600">
                    +{paisaToBdt(payment.amount)}
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full mt-1 ${
                      payment.status === 'confirmed'
                        ? 'bg-green-100'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100'
                        : 'bg-red-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium capitalize ${
                        payment.status === 'confirmed'
                          ? 'text-green-700'
                          : payment.status === 'pending'
                          ? 'text-yellow-700'
                          : 'text-red-700'
                      }`}
                    >
                      {payment.status}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
