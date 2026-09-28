/**
 * Members Screen — View mess members
 */

import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { useMessMembers } from '@/features/mess/queries';

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: members, isLoading, refetch, isRefetching } = useMessMembers(id);

  const activeMembers = members?.filter(m => m.status === 'active') ?? [];
  const pendingMembers = members?.filter(m => m.status === 'pending') ?? [];

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Stats */}
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Text className="text-sm text-gray-500">Active</Text>
            <Text className="text-2xl font-bold text-green-600 mt-1">
              {activeMembers.length}
            </Text>
          </Card>
          {pendingMembers.length > 0 && (
            <Card className="flex-1">
              <Text className="text-sm text-gray-500">Pending</Text>
              <Text className="text-2xl font-bold text-yellow-600 mt-1">
                {pendingMembers.length}
              </Text>
            </Card>
          )}
        </View>

        {/* Pending Members */}
        {pendingMembers.length > 0 && (
          <View>
            <Text className="font-semibold text-lg mb-3">Pending Requests</Text>
            {pendingMembers.map(member => (
              <Card key={member.id} className="mb-2 border-l-4 border-l-yellow-500">
                <View className="flex-row items-center gap-3">
                  <ProfileAvatar
                    name={member.user_name ?? 'Unknown'}
                    url={member.user_avatar_url}
                    size={40}
                  />
                  <View className="flex-1">
                    <Text className="font-medium">{member.user_name ?? 'Unknown'}</Text>
                    <Text className="text-sm text-gray-500">Request pending</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Active Members */}
        <View>
          <Text className="font-semibold text-lg mb-3">Members</Text>
          {isLoading ? (
            <ActivityIndicator className="py-8" />
          ) : activeMembers.length === 0 ? (
            <Card className="py-8 items-center">
              <Ionicons name="people-outline" size={40} className="text-gray-300" />
              <Text className="text-gray-500 mt-2">No active members</Text>
            </Card>
          ) : (
            activeMembers.map(member => (
              <Card key={member.id} className="mb-2">
                <View className="flex-row items-center gap-3">
                  <ProfileAvatar
                    name={member.user_name ?? 'Unknown'}
                    url={member.user_avatar_url}
                    size={48}
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-medium">
                        {member.user_name ?? 'Unknown'}
                      </Text>
                      {member.role === 'manager' && (
                        <View className="px-2 py-0.5 bg-primary/10 rounded-full">
                          <Text className="text-xs font-medium text-primary">Manager</Text>
                        </View>
                      )}
                    </View>
                    {member.user_phone && (
                      <Text className="text-sm text-gray-500">{member.user_phone}</Text>
                    )}
                    <Text className="text-xs text-gray-400 mt-1">
                      Joined {member.joined_at
                        ? new Date(member.joined_at).toLocaleDateString('en-GB')
                        : 'Unknown'}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
