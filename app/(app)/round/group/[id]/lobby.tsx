import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useActionSheet } from '@/components/ActionSheet';
import { Wordmark } from '@/components/Wordmark';
import { PlayerTile } from '@/components/PlayerTile';
import { InviteSearchSheet } from '@/components/InviteSearchSheet';
import {
  useGroupRound,
  useInviteToRound,
  useStartGroupRound,
  useWithdrawFromRound,
} from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';

export default function Lobby() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const groupQ = useGroupRound(id);
  const invite = useInviteToRound();
  const start = useStartGroupRound();
  const withdraw = useWithdrawFromRound();
  const [inviteOpen, setInviteOpen] = useState(false);
  const sheet = useActionSheet();

  const round = groupQ.data?.round;
  const players = groupQ.data?.players ?? [];
  const isHost = round?.user_id === session?.user.id;
  const joinedCount = players.filter((p) => p.status === 'joined').length;

  // If round has started, route to score
  if (round?.invites_locked_at) {
    return (
      <Redirect
        href={{ pathname: '/round/group/[id]/score', params: { id: round.id, hole: '1' } }}
      />
    );
  }

  const onCopyCode = async () => {
    if (!round?.join_code) return;
    await Clipboard.setStringAsync(round.join_code);
    sheet.show({
      title: 'Copied',
      subtitle: `Code ${round.join_code} copied to clipboard.`,
      actions: [{ label: 'OK' }],
    });
  };

  const onStart = async () => {
    if (!round) return;
    await start.mutateAsync({ roundId: round.id });
  };

  const onLeave = () => {
    if (!round || !session?.user.id) return;
    sheet.show({
      title: isHost ? 'Cancel round?' : 'Leave round?',
      subtitle: isHost
        ? 'This deletes the round for everyone.'
        : 'You can rejoin later via the join code.',
      cancelLabel: 'Stay',
      actions: [
        {
          label: isHost ? 'Cancel round' : 'Leave',
          tone: 'destructive',
          onPress: async () => {
            if (isHost) {
              await supabase.from('rounds').delete().eq('id', round.id);
            } else {
              await withdraw.mutateAsync({ roundId: round.id, userId: session.user.id });
            }
            router.replace('/(app)/(tabs)');
          },
        },
      ],
    });
  };

  if (!round) return null;

  return (
    <ScreenContainer surface="bone">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
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
          <Pressable onPress={onLeave} hitSlop={8}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.clay,
                opacity: 0.85,
                textTransform: 'uppercase',
              }}
            >
              {isHost ? 'CANCEL' : 'LEAVE'}
            </Text>
          </Pressable>
        </View>

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
          LOBBY
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 36,
            color: palette.ink,
            marginTop: 4,
          }}
        >
          Waiting for players
        </Text>

        {/* Join code */}
        <Pressable
          onPress={onCopyCode}
          style={{
            marginTop: 24,
            paddingVertical: 18,
            paddingHorizontal: 16,
            borderWidth: 0.5,
            borderColor: palette.ink + '33',
          }}
        >
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
            JOIN CODE · TAP TO COPY
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: 32,
              color: palette.ink,
              letterSpacing: 4,
              marginTop: 4,
            }}
          >
            {round.join_code}
          </Text>
        </Pressable>

        {/* Players */}
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
          PLAYERS
        </Text>
        {players.map((p) => (
          <View key={p.user_id} style={{ marginBottom: 8 }}>
            <PlayerTile
              displayName={p.profile?.display_name ?? '—'}
              username={p.profile?.username ?? null}
              status={p.status as 'invited' | 'joined' | 'withdrawn' | 'finished'}
              isHost={p.user_id === round.user_id}
              isMe={p.user_id === session?.user.id}
            />
          </View>
        ))}

        {isHost ? (
          <>
            <Pressable
              onPress={() => setInviteOpen(true)}
              style={{
                marginTop: 12,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 0.5,
                borderColor: palette.ink + '33',
                borderStyle: 'dashed',
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 12,
                  letterSpacing: 12 * 0.16,
                  color: palette.fairway,
                  textTransform: 'uppercase',
                }}
              >
                + INVITE A MUTUAL
              </Text>
            </Pressable>

            <Pressable
              onPress={onStart}
              disabled={joinedCount < 1 || start.isPending}
              style={{
                marginTop: 32,
                backgroundColor: palette.brass,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: start.isPending || joinedCount < 1 ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 13,
                  letterSpacing: 13 * 0.18,
                  color: palette.ink,
                  textTransform: 'uppercase',
                }}
              >
                START ROUND →
              </Text>
            </Pressable>
          </>
        ) : (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 32,
              textAlign: 'center',
            }}
          >
            Waiting for the host to start...
          </Text>
        )}
      </ScrollView>

      <InviteSearchSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        myUserId={session?.user.id}
        excludeIds={players.map((p) => p.user_id)}
        onPick={(userId) => {
          if (!session?.user.id) return;
          invite.mutate({
            roundId: round.id,
            userId,
            teeBox: round.tee_box,
            invitedBy: session.user.id,
          });
        }}
      />
    </ScreenContainer>
  );
}
