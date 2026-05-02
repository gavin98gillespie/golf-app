import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { RoundListItem } from '@/components/RoundListItem';
import { StatsSummaryCard } from '@/components/StatsSummaryCard';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile } from '@/lib/queries/profile';
import { useUserRounds } from '@/lib/queries/rounds';
import { useUserSummaryStats } from '@/lib/queries/stats';
import { useFollowerCount, useFollowingCount } from '@/lib/queries/follows';

export default function Profile() {
  const { session } = useSession();
  const viewerId = session?.user.id;
  const profileQ = useMyProfile(viewerId);
  const roundsQ = useUserRounds(viewerId);
  const statsQ = useUserSummaryStats(viewerId);
  const followersQ = useFollowerCount(viewerId);
  const followingQ = useFollowingCount(viewerId);

  const rounds = (roundsQ.data ?? []) as Parameters<typeof RoundListItem>[0]['round'][];
  const username = profileQ.data?.username;

  return (
    <ScreenContainer>
      <View className="mt-8 mb-6 flex-row items-start justify-between">
        <View>
          <Text className="text-text-primary text-3xl font-light tracking-tight">
            {profileQ.data?.display_name ?? '...'}
          </Text>
          <Text className="text-text-secondary text-sm mt-1">
            @{profileQ.data?.username ?? '...'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          className="px-3 py-1 rounded-full border border-border-subtle active:opacity-60"
          accessibilityLabel="Open settings"
        >
          <Text className="text-text-secondary text-xs uppercase tracking-wider">Settings</Text>
        </Pressable>
      </View>

      <View className="flex-row py-4 border-y border-border-subtle mb-6">
        <Pressable
          onPress={() =>
            username
              ? router.push({ pathname: '/relations/[username]/followers', params: { username } })
              : undefined
          }
          className="flex-1 active:opacity-70"
        >
          <Text className="text-text-primary text-xl font-light">{followersQ.data ?? 0}</Text>
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-1">
            Followers
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            username
              ? router.push({ pathname: '/relations/[username]/following', params: { username } })
              : undefined
          }
          className="flex-1 active:opacity-70"
        >
          <Text className="text-text-primary text-xl font-light">{followingQ.data ?? 0}</Text>
          <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-1">
            Following
          </Text>
        </Pressable>
      </View>

      <View className="mb-6">
        <StatsSummaryCard
          byHoleCount={statsQ.data?.byHoleCount ?? {}}
          totalRounds={statsQ.data?.totalRounds ?? 0}
        />
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
