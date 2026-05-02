import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { FollowButton } from './FollowButton';
import type { PublicProfile } from '@/lib/queries/users';

type Props = {
  user: PublicProfile;
  viewerId: string;
};

export function UserListItem({ user, viewerId }: Props) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/profile/[username]', params: { username: user.username } })
      }
      className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
    >
      <View className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle items-center justify-center">
        <Text className="text-text-secondary text-base font-semibold">
          {user.display_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-text-primary text-base font-semibold">{user.display_name}</Text>
        <Text className="text-text-secondary text-xs">@{user.username}</Text>
      </View>
      <FollowButton viewerId={viewerId} targetId={user.id} size="sm" />
    </Pressable>
  );
}
