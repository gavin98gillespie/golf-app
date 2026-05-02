import { ActivityIndicator, FlatList, Pressable, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { UserListItem } from '@/components/UserListItem';
import { useSession } from '@/lib/hooks/useSession';
import { useProfileByUsername } from '@/lib/queries/users';
import { useFollowersList } from '@/lib/queries/follows';

export default function Followers() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { session } = useSession();
  const viewerId = session?.user.id;

  const profileQ = useProfileByUsername(username);
  const listQ = useFollowersList(profileQ.data?.id);

  const isViewerOwnList = !!viewerId && profileQ.data?.id === viewerId;

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} className="mt-6 active:opacity-70">
        <Text className="text-accent text-sm">← Back</Text>
      </Pressable>
      <Text className="text-text-primary text-3xl font-light mt-4">Followers</Text>

      {profileQ.isLoading || listQ.isLoading ? (
        <ActivityIndicator className="mt-6" />
      ) : (listQ.data ?? []).length === 0 ? (
        <Text className="text-text-secondary text-sm mt-4">No followers yet.</Text>
      ) : (
        <FlatList
          data={listQ.data ?? []}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) =>
            viewerId ? (
              <UserListItem user={item} viewerId={viewerId} followBackHint={isViewerOwnList} />
            ) : null
          }
        />
      )}
    </ScreenContainer>
  );
}
