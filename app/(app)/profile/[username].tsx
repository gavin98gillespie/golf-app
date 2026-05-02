import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { FollowButton } from '@/components/FollowButton';
import { ReportSheet } from '@/components/ReportSheet';
import { useSession } from '@/lib/hooks/useSession';
import { useProfileByUsername } from '@/lib/queries/users';
import { useFollowerCount, useFollowingCount, useIsMutual } from '@/lib/queries/follows';
import { useBlock, useUnblock, useIsBlocked } from '@/lib/queries/blocks';
import type { ReportTargetType } from '@/lib/queries/reports';
import { supabase, type Tables } from '@/lib/supabase';

type RoundWithCourse = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count'> | null;
};

export default function OtherProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { session } = useSession();
  const viewerId = session?.user.id;

  const profileQ = useProfileByUsername(username);
  const profile = profileQ.data;

  const isSelf = !!profile && !!viewerId && profile.id === viewerId;

  useEffect(() => {
    if (isSelf) router.replace('/(app)/(tabs)/profile');
  }, [isSelf]);

  const followersQ = useFollowerCount(profile?.id);
  const followingQ = useFollowingCount(profile?.id);
  const mutualQ = useIsMutual(viewerId, profile?.id);

  const isBlockedQ = useIsBlocked(viewerId, profile?.id);
  const block = useBlock();
  const unblock = useUnblock();
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(
    null,
  );

  const openReportSheet = (input: { targetType: ReportTargetType; targetId: string }) => {
    setReportTarget({ type: input.targetType, id: input.targetId });
  };

  const onTapMore = () => {
    if (!viewerId || !profile) return;
    const blocked = isBlockedQ.data ?? false;
    Alert.alert('Options', `@${profile.username}`, [
      blocked
        ? {
            text: 'Unblock',
            onPress: () => unblock.mutate({ blockerId: viewerId, blockedId: profile.id }),
          }
        : {
            text: 'Block',
            style: 'destructive',
            onPress: () =>
              Alert.alert(
                'Block this user?',
                "They won't be able to see your profile or rounds. You won't see theirs.",
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Block',
                    style: 'destructive',
                    onPress: () => block.mutate({ blockerId: viewerId, blockedId: profile.id }),
                  },
                ],
              ),
          },
      {
        text: 'Report',
        onPress: () => openReportSheet({ targetType: 'profile', targetId: profile.id }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const roundsCountQ = useQuery({
    queryKey: ['profile_rounds_count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count, error } = await supabase
        .from('rounds')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_draft', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile?.id,
  });

  const recentRoundsQ = useQuery({
    queryKey: ['user_recent_rounds', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('rounds')
        .select('*, courses(name, hole_count)')
        .eq('user_id', profile.id)
        .eq('is_draft', false)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as RoundWithCourse[];
    },
    enabled: !!profile?.id && (mutualQ.data ?? false),
  });

  if (profileQ.isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator className="mt-20" />
      </ScreenContainer>
    );
  }
  if (!profile) {
    return (
      <ScreenContainer>
        <BackButton />
        <Text className="text-text-primary text-xl mt-8">User not found</Text>
      </ScreenContainer>
    );
  }
  if (isSelf) return null;

  const isMutual = mutualQ.data ?? false;

  return (
    <ScreenContainer>
      <BackButton />

      <View className="flex-row items-center mt-6">
        <View className="w-16 h-16 rounded-full bg-bg-surface border border-border-subtle items-center justify-center">
          <Text className="text-text-secondary text-2xl font-semibold">
            {profile.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1 ml-4">
          <Text className="text-text-primary text-2xl font-light">{profile.display_name}</Text>
          <Text className="text-text-secondary text-sm">@{profile.username}</Text>
        </View>
        {viewerId ? <FollowButton viewerId={viewerId} targetId={profile.id} /> : null}
        {viewerId ? (
          <Pressable onPress={onTapMore} className="ml-2 p-2 active:opacity-70">
            <Text className="text-text-secondary text-base">•••</Text>
          </Pressable>
        ) : null}
      </View>

      {profile.bio ? (
        <Text className="text-text-primary text-sm mt-4 leading-5">{profile.bio}</Text>
      ) : null}

      <View className="flex-row mt-6 py-4 border-y border-border-subtle">
        <Stat label="Rounds" value={roundsCountQ.data ?? 0} />
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/relations/[username]/followers',
              params: { username: profile.username },
            })
          }
          className="flex-1 active:opacity-70"
        >
          <Stat label="Followers" value={followersQ.data ?? 0} />
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/relations/[username]/following',
              params: { username: profile.username },
            })
          }
          className="flex-1 active:opacity-70"
        >
          <Stat label="Following" value={followingQ.data ?? 0} />
        </Pressable>
      </View>

      <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-6 mb-2">
        Recent rounds
      </Text>

      {!isMutual ? (
        <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mt-2">
          <Text className="text-text-primary text-sm">Follow each other to see their rounds.</Text>
        </View>
      ) : recentRoundsQ.isLoading ? (
        <ActivityIndicator className="my-4" />
      ) : (recentRoundsQ.data ?? []).length === 0 ? (
        <Text className="text-text-secondary text-sm mt-2">No rounds yet.</Text>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={recentRoundsQ.data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <RoundRow round={item} />}
        />
      )}

      {viewerId && reportTarget ? (
        <ReportSheet
          visible
          reporterId={viewerId}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          onClose={() => setReportTarget(null)}
        />
      ) : null}
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1">
      <Text className="text-text-primary text-xl font-light">{value}</Text>
      <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-1">{label}</Text>
    </View>
  );
}

function RoundRow({ round }: { round: RoundWithCourse }) {
  const diff = round.total_score - round.total_par;
  const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/round/[id]', params: { id: round.id } })}
      className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
    >
      <View className="flex-1">
        <Text className="text-text-primary text-base">{round.courses?.name ?? '—'}</Text>
        <Text className="text-text-secondary text-xs mt-0.5">
          {format(new Date(round.played_at), 'MMM d, yyyy')}
        </Text>
      </View>
      <Text className="text-text-primary text-lg font-light">{round.total_score}</Text>
      <Text className="text-text-secondary text-xs ml-2 w-10 text-right">{diffLabel}</Text>
    </Pressable>
  );
}

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} className="mt-6 active:opacity-70">
      <Text className="text-accent text-sm">← Back</Text>
    </Pressable>
  );
}
