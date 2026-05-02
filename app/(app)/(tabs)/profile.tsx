import { FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { RoundListItem } from '@/components/RoundListItem';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile } from '@/lib/queries/profile';
import { useUserRounds } from '@/lib/queries/rounds';

export default function Profile() {
  const { session } = useSession();
  const profileQ = useMyProfile(session?.user.id);
  const roundsQ = useUserRounds(session?.user.id);

  const rounds = (roundsQ.data ?? []) as Parameters<typeof RoundListItem>[0]['round'][];

  return (
    <ScreenContainer>
      <View className="mt-8 mb-6">
        <Text className="text-text-primary text-3xl font-light tracking-tight">
          {profileQ.data?.display_name ?? '...'}
        </Text>
        <Text className="text-text-secondary text-sm mt-1">
          @{profileQ.data?.username ?? '...'}
        </Text>
      </View>

      <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">
        Rounds ({rounds.length})
      </Text>
      <FlatList
        data={rounds}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RoundListItem round={item} onPress={() => router.push(`/round/${item.id}`)} />
        )}
        ListEmptyComponent={
          <Text className="text-text-secondary text-sm mt-6">
            No rounds yet. Hit the +Round tab to score your first.
          </Text>
        }
        refreshing={roundsQ.isFetching}
        onRefresh={() => roundsQ.refetch()}
      />
    </ScreenContainer>
  );
}
