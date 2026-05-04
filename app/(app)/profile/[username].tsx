import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { FollowButton } from '@/components/FollowButton';
import { ReportSheet } from '@/components/ReportSheet';
import { useActionSheet } from '@/components/ActionSheet';
import { Datum } from '@/components/Datum';
import { useSession } from '@/lib/hooks/useSession';
import { useProfileByUsername } from '@/lib/queries/users';
import { useFollowerCount, useFollowingCount, useIsFollowing } from '@/lib/queries/follows';
import { useBlock, useUnblock, useIsBlocked } from '@/lib/queries/blocks';
import type { ReportTargetType } from '@/lib/queries/reports';
import { supabase, type Tables } from '@/lib/supabase';
import { parseLocalDate } from '@/lib/date';
import { palette, fontFamily } from '@/theme/linksman';

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
  const isFollowingQ = useIsFollowing(viewerId, profile?.id);

  const isBlockedQ = useIsBlocked(viewerId, profile?.id);
  const block = useBlock();
  const unblock = useUnblock();
  const sheet = useActionSheet();
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(
    null,
  );

  const openReportSheet = (input: { targetType: ReportTargetType; targetId: string }) => {
    setReportTarget({ type: input.targetType, id: input.targetId });
  };

  const onTapMore = () => {
    if (!viewerId || !profile) return;
    const blocked = isBlockedQ.data ?? false;
    sheet.show({
      eyebrow: `@${profile.username}`,
      title: 'Options',
      actions: [
        blocked
          ? {
              label: 'Unblock',
              onPress: () => unblock.mutate({ blockerId: viewerId, blockedId: profile.id }),
            }
          : {
              label: 'Block',
              tone: 'destructive' as const,
              onPress: () =>
                sheet.show({
                  title: 'Block this user?',
                  subtitle:
                    "They won't be able to see your profile or rounds. You won't see theirs.",
                  actions: [
                    {
                      label: 'Block',
                      tone: 'destructive' as const,
                      onPress: () => block.mutate({ blockerId: viewerId, blockedId: profile.id }),
                    },
                  ],
                }),
            },
        {
          label: 'Report',
          onPress: () => openReportSheet({ targetType: 'profile', targetId: profile.id }),
        },
      ],
    });
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
    enabled: !!profile?.id && (isFollowingQ.data ?? false),
  });

  if (profileQ.isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator style={{ marginTop: 80 }} color={palette.bone} />
      </ScreenContainer>
    );
  }
  if (!profile) {
    return (
      <ScreenContainer>
        <BackButton />
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 24,
            color: palette.bone,
            marginTop: 32,
          }}
        >
          User not found
        </Text>
      </ScreenContainer>
    );
  }
  if (isSelf) return null;

  const isFollowing = isFollowingQ.data ?? false;

  return (
    <ScreenContainer>
      <FlatList
        data={isFollowing ? (recentRoundsQ.data ?? []) : []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <BackButton />

            {/* Top row: meta + actions */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 9,
                  letterSpacing: 9 * 0.2,
                  color: palette.bone,
                  opacity: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {format(new Date(), 'MMMM yyyy').toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {viewerId ? <FollowButton viewerId={viewerId} targetId={profile.id} /> : null}
                {viewerId ? (
                  <Pressable onPress={onTapMore} hitSlop={8} style={{ padding: 4 }}>
                    <Text
                      style={{
                        fontFamily: fontFamily.mono,
                        fontSize: 14,
                        color: palette.bone,
                        opacity: 0.7,
                      }}
                    >
                      •••
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Hero */}
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 36,
                letterSpacing: -36 * 0.02,
                color: palette.bone,
                marginTop: 12,
              }}
            >
              {profile.display_name}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.bone,
                opacity: 0.55,
                marginTop: 2,
              }}
            >
              @{profile.username}
            </Text>

            {profile.bio ? (
              <Text
                style={{
                  fontFamily: fontFamily.editorial,
                  fontSize: 14,
                  color: palette.bone,
                  opacity: 0.85,
                  marginTop: 16,
                  lineHeight: 20,
                }}
              >
                {profile.bio}
              </Text>
            ) : null}

            {/* Stat row */}
            <View
              style={{
                flexDirection: 'row',
                marginTop: 24,
                paddingVertical: 16,
                borderTopWidth: 0.5,
                borderBottomWidth: 0.5,
                borderColor: palette.bone + '33',
              }}
            >
              <View style={{ flex: 1 }}>
                <Datum label="ROUNDS" value={roundsCountQ.data ?? 0} color={palette.bone} />
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/relations/[username]/followers',
                    params: { username: profile.username },
                  })
                }
                style={{ flex: 1 }}
              >
                <Datum label="FOLLOWERS" value={followersQ.data ?? 0} color={palette.bone} />
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/relations/[username]/following',
                    params: { username: profile.username },
                  })
                }
                style={{ flex: 1, alignItems: 'flex-end' }}
              >
                <Datum
                  label="FOLLOWING"
                  value={followingQ.data ?? 0}
                  color={palette.bone}
                  align="right"
                />
              </Pressable>
            </View>

            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.2,
                color: palette.bone,
                opacity: 0.55,
                textTransform: 'uppercase',
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              Recent rounds
            </Text>

            {!isFollowing ? (
              <View
                style={{
                  borderWidth: 0.5,
                  borderColor: palette.bone + '33',
                  padding: 16,
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.editorial,
                    fontSize: 14,
                    color: palette.bone,
                    opacity: 0.85,
                  }}
                >
                  Follow them to see their rounds.
                </Text>
              </View>
            ) : recentRoundsQ.isLoading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={palette.bone} />
            ) : (recentRoundsQ.data ?? []).length === 0 ? (
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 11,
                  color: palette.bone,
                  opacity: 0.55,
                  marginTop: 8,
                }}
              >
                No rounds yet.
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <RoundRow round={item} />}
        ListFooterComponent={
          viewerId && reportTarget ? (
            <ReportSheet
              visible
              reporterId={viewerId}
              targetType={reportTarget.type}
              targetId={reportTarget.id}
              onClose={() => setReportTarget(null)}
            />
          ) : null
        }
      />
    </ScreenContainer>
  );
}

function RoundRow({ round }: { round: RoundWithCourse }) {
  const diff = round.total_score - round.total_par;
  const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/round/[id]', params: { id: round.id } })}
      style={{
        flexDirection: 'row',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: palette.bone + '20',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 16, color: palette.bone }}>
          {round.courses?.name ?? '—'}
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 10,
            letterSpacing: 10 * 0.16,
            color: palette.bone,
            opacity: 0.55,
            marginTop: 2,
            textTransform: 'uppercase',
          }}
        >
          {format(parseLocalDate(round.played_at), 'MMM d, yyyy').toUpperCase()}
        </Text>
      </View>
      <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.bone }}>
        {round.total_score}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          color: palette.bone,
          opacity: 0.6,
          marginLeft: 8,
          width: 32,
          textAlign: 'right',
        }}
      >
        {diffLabel}
      </Text>
    </Pressable>
  );
}

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={{ marginTop: 16 }} hitSlop={8}>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          letterSpacing: 11 * 0.16,
          color: palette.bone,
          opacity: 0.7,
          textTransform: 'uppercase',
        }}
      >
        ← BACK
      </Text>
    </Pressable>
  );
}
