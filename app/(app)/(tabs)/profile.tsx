import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { ScoreNumeral } from '@/components/ScoreNumeral';
import { Datum } from '@/components/Datum';
import { WeeklySummary } from '@/components/WeeklySummary';
import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile } from '@/lib/queries/profile';
import { useUserRounds } from '@/lib/queries/rounds';
import { useUserSummaryStats } from '@/lib/queries/stats';
import { useFollowerCount, useFollowingCount } from '@/lib/queries/follows';
import { palette, fontFamily } from '@/theme/linksman';
import { parseLocalDate } from '@/lib/date';

type ProfileRound = {
  id: string;
  total_score: number;
  total_par: number;
  played_at: string;
  courses?: { name?: string | null } | null;
};

export default function Profile() {
  const { session } = useSession();
  const viewerId = session?.user.id;
  const profileQ = useMyProfile(viewerId);
  const roundsQ = useUserRounds(viewerId);
  const statsQ = useUserSummaryStats(viewerId);
  const followersQ = useFollowerCount(viewerId);
  const followingQ = useFollowingCount(viewerId);

  const profile = profileQ.data;
  const rounds = (roundsQ.data ?? []) as ProfileRound[];
  const summary = statsQ.data;
  const totalRounds = summary?.totalRounds ?? rounds.length;
  const handicap = computeHandicap(rounds);

  if (!profile) return null;

  const username = profile.username;

  return (
    <ScreenContainer surface="bone">
      <FlatList
        data={rounds}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshing={roundsQ.isFetching}
        onRefresh={() => roundsQ.refetch()}
        ListHeaderComponent={
          <View>
            {/* Top bar */}
            <View
              style={{
                paddingTop: 8,
                paddingBottom: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Wordmark size={20} color={palette.ink} />
            </View>

            {/* Hero block */}
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.2,
                color: palette.ink,
                opacity: 0.5,
                textTransform: 'uppercase',
                marginTop: 16,
              }}
            >
              {format(new Date(), 'MMMM yyyy').toUpperCase()}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 36,
                letterSpacing: -36 * 0.02,
                color: palette.ink,
                marginTop: 4,
              }}
            >
              {profile.display_name}
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.ink,
                opacity: 0.55,
                marginTop: 2,
              }}
            >
              @{profile.username}
            </Text>

            {/* Handicap hero */}
            <View style={{ alignItems: 'center', marginTop: 32 }}>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 9,
                  letterSpacing: 9 * 0.2,
                  color: palette.ink,
                  opacity: 0.55,
                  textTransform: 'uppercase',
                }}
              >
                AVG VS PAR
              </Text>
              <ScoreNumeral
                value={
                  handicap == null
                    ? '—'
                    : handicap >= 0
                      ? `+${handicap.toFixed(1)}`
                      : handicap.toFixed(1)
                }
                size={88}
                color={palette.ink}
              />
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 10,
                  letterSpacing: 10 * 0.16,
                  color: palette.ink,
                  opacity: 0.45,
                  marginTop: 4,
                  textTransform: 'uppercase',
                }}
              >
                last 10 rounds
              </Text>
            </View>

            {/* Stat row */}
            <View
              style={{
                flexDirection: 'row',
                marginTop: 24,
                paddingVertical: 16,
                borderTopWidth: 0.5,
                borderBottomWidth: 0.5,
                borderColor: palette.ink + '33',
              }}
            >
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Datum label="ROUNDS" value={totalRounds} color={palette.ink} align="center" />
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/relations/[username]/followers',
                    params: { username },
                  })
                }
                style={{ flex: 1, alignItems: 'center' }}
              >
                <Datum
                  label="FOLLOWERS"
                  value={followersQ.data ?? 0}
                  color={palette.ink}
                  align="center"
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/relations/[username]/following',
                    params: { username },
                  })
                }
                style={{ flex: 1, alignItems: 'center' }}
              >
                <Datum
                  label="FOLLOWING"
                  value={followingQ.data ?? 0}
                  color={palette.ink}
                  align="center"
                />
              </Pressable>
            </View>

            {/* Weekly summary */}
            {viewerId ? <WeeklySummary userId={viewerId} /> : null}

            {/* Recent rounds label */}
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.2,
                color: palette.ink,
                opacity: 0.55,
                textTransform: 'uppercase',
                marginTop: 32,
                marginBottom: 8,
              }}
            >
              Recent rounds
            </Text>
          </View>
        }
        renderItem={({ item }) => <ProfileRoundRow round={item} />}
        ListEmptyComponent={
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 16,
            }}
          >
            No rounds yet. Hit the Play tab to score your first.
          </Text>
        }
        ListFooterComponent={
          <Pressable
            onPress={() => router.push('/(app)/stats')}
            style={{ marginTop: 24, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.18,
                color: palette.fairway,
                textTransform: 'uppercase',
              }}
            >
              VIEW DETAILED STATS →
            </Text>
          </Pressable>
        }
      />
    </ScreenContainer>
  );
}

function ProfileRoundRow({ round }: { round: ProfileRound }) {
  const diff = round.total_score - round.total_par;
  const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/round/[id]', params: { id: round.id } })}
      style={{
        flexDirection: 'row',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: palette.ink + '20',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 16, color: palette.ink }}>
          {round.courses?.name ?? '—'}
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 10,
            letterSpacing: 10 * 0.16,
            color: palette.ink,
            opacity: 0.55,
            marginTop: 2,
            textTransform: 'uppercase',
          }}
        >
          {format(parseLocalDate(round.played_at), 'MMM d, yyyy').toUpperCase()}
        </Text>
      </View>
      <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.ink }}>
        {round.total_score}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          color: palette.ink,
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

function computeHandicap(rounds: ProfileRound[]): number | null {
  if (!rounds || rounds.length === 0) return null;
  const recent = rounds.slice(0, 10);
  if (recent.length === 0) return null;
  const sum = recent.reduce((s, r) => s + (r.total_score - r.total_par), 0);
  return sum / recent.length;
}
