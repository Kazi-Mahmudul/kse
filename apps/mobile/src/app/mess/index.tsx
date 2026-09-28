/**
 * Mess Management — Main Mess Hub Screen
 * Shows user's messes, create new, or join existing
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyMesses, useCreateMess, useJoinMess } from '@/features/mess/queries';

// ── Create Mess Form ─────────────────────────────────────────────────────────

import { useForm } from 'react-hook-form';
import { TextField } from '@/components/ui/text-field';

export default function MessHubScreen() {
  const { data: messes, isLoading, refetch, isRefetching } = useMyMesses();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const activeMesses = messes?.filter(m => m.status === 'active') ?? [];
  const pendingMesses = messes?.filter(m => m.status === 'pending') ?? [];

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-2xl font-bold">Mess Management</Text>
            <Text className="text-gray-500 mt-1">
              Manage your mess operations
            </Text>
          </View>
        </View>

        {/* Pending Requests */}
        {pendingMesses.length > 0 && (
          <View>
            <Text className="text-lg font-semibold mb-2">Pending Requests</Text>
            {pendingMesses.map(mess => (
              <Card key={mess.id} className="mb-2 border-l-4 border-l-yellow-500">
                <Text className="font-medium">{mess.name}</Text>
                <Text className="text-sm text-gray-500">Waiting for manager approval</Text>
              </Card>
            ))}
          </View>
        )}

        {/* Active Messes */}
        {activeMesses.length === 0 && !showCreate && !showJoin ? (
          <EmptyState
            icon="restaurant-outline"
            title="No Mess Yet"
            message="Create a new mess or join an existing one to get started"
            actionLabel="Create Mess"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold">My Messes</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setShowJoin(true)}
                  className="p-2"
                >
                  <Ionicons name="link" size={22} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowCreate(true)}
                  className="p-2"
                >
                  <Ionicons name="add-circle-outline" size={22} />
                </TouchableOpacity>
              </View>
            </View>

            {activeMesses.map(mess => (
              <TouchableOpacity
                key={mess.id}
                onPress={() => router.push({ pathname: '/mess/[id]', params: { id: mess.id } } as any)}
              >
                <Card className="mb-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-lg">{mess.name}</Text>
                      {mess.location && (
                        <Text className="text-sm text-gray-500 mt-1">{mess.location}</Text>
                      )}
                      <View className="flex-row items-center gap-2 mt-2">
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="people-outline" size={14} />
                          <Text className="text-sm text-gray-500">
                            {mess.member_count ?? 0} members
                          </Text>
                        </View>
                        <View className="px-2 py-0.5 bg-green-100 rounded-full">
                          <Text className="text-xs text-green-700">Active</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} className="text-gray-400" />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Create Mess Form */}
        {showCreate && (
          <CreateMessForm onClose={() => setShowCreate(false)} />
        )}

        {/* Join Mess Form */}
        {showJoin && (
          <JoinMessForm onClose={() => setShowJoin(false)} />
        )}
      </ScrollView>
    </Screen>
  );
}

function CreateMessForm({ onClose }: { onClose: () => void }) {
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: '', location: '', address: '', max_members: '10' },
  });
  const createMess = useCreateMess();

  const onSubmit = async (data: Record<string, string>) => {
    try {
      const result = await createMess.mutateAsync({
        name: data.name,
        location: data.location || undefined,
        address: data.address || undefined,
        max_members: parseInt(data.max_members, 10),
      });
      onClose();
      if (result?.id) {
        router.push({ pathname: '/mess/[id]', params: { id: result.id } } as any);
      }
    } catch (e) {
      // Error handled in mutation
    }
  };

  return (
    <Card className="mt-2">
      <Text className="font-semibold text-lg mb-4">Create New Mess</Text>
      <View className="gap-3">
        <TextField
          control={control}
          name="name"
          label="Mess Name *"
          placeholder="e.g., 12 No. Bachelor Mess"
        />
        <TextField
          control={control}
          name="location"
          label="Location"
          placeholder="e.g., Boyra, Khulna"
        />
        <TextField
          control={control}
          name="address"
          label="Address"
          placeholder="Full address"
        />
        <TextField
          control={control}
          name="max_members"
          label="Max Members"
          placeholder="10"
          keyboardType="number-pad"
        />
        <View className="flex-row gap-3 mt-2">
          <PrimaryButton
            label="Cancel"
            variant="outline"
            onPress={onClose}
            className="flex-1"
          />
          <PrimaryButton
            label="Create"
            onPress={handleSubmit(onSubmit)}
            loading={createMess.isPending}
            className="flex-1"
          />
        </View>
      </View>
    </Card>
  );
}

// ── Join Mess Form ────────────────────────────────────────────────────────────

function JoinMessForm({ onClose }: { onClose: () => void }) {
  const { control, handleSubmit } = useForm({
    defaultValues: { mess_id: '', invite_code: '' },
  });
  const joinMess = useJoinMess();

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await joinMess.mutateAsync({
        messId: data.mess_id,
        inviteCode: data.invite_code || undefined,
      });
      onClose();
    } catch (e) {
      // Error handled in mutation
    }
  };

  return (
    <Card className="mt-2">
      <Text className="font-semibold text-lg mb-4">Join Existing Mess</Text>
      <View className="gap-3">
        <TextField
          control={control}
          name="mess_id"
          label="Mess Code *"
          placeholder="e.g., KSE-MESS-8F42"
        />
        <TextField
          control={control}
          name="invite_code"
          label="Invite Code (Optional)"
          placeholder="If you have an invite code"
        />
        <View className="flex-row gap-3 mt-2">
          <PrimaryButton
            label="Cancel"
            variant="outline"
            onPress={onClose}
            className="flex-1"
          />
          <PrimaryButton
            label="Join"
            onPress={handleSubmit(onSubmit)}
            loading={joinMess.isPending}
            className="flex-1"
          />
        </View>
      </View>
    </Card>
  );
}
