import { GAME_RULES, isGameKind } from '@/lib/gameRules';
import { RulesButton } from '@/components/GameRulesSheet';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { SkinsGamePanel } from '@/components/SkinsGamePanel';
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
  const { id, manage, game } = useLocalSearchParams<{
    id: string;
    manage?: string;
    game?: string;
  }>();
  const selectedGame = isGameKind(game) ? game : undefined;
  const { session } = useSession();
  const groupQ = useGroupRound(id);
  const invite = useInviteToRound();
  const start = useStartGroupRound();
  const withdraw = useWithdrawFromRound();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const sheet = useActionSheet();

  const round = groupQ.data?.round;
  const players = groupQ.data?.players ?? [];
  const isHost = round?.user_id === session?.user.id;
  const canManage =
    isHost ||
    players.some(
      (p) => p.user_id === session?.user.id && ['joined', 'finished'].includes(p.status),
    );
  const joinedCount = players.filter(
    (p) => p.status === 'joined' || p.status === 'finished',
  ).length;

  // If round has started, route to score
  if (round?.invites_locked_at && manage !== '1') {
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
    if (round.invites_locked_at) {
      router.replace({ pathname: '/round/group/[id]/score', params: { id } });
      return;
    }
    try {
      await start.mutateAsync({ roundId: round.id });
    } catch (error) {
      Alert.alert(
        'Could not start round',
        (error as { message?: string }).message ?? 'Please try again.',
      );
    }
  };

  const onLeave = () => {
    if (!round || !session?.user.id) return;
    sheet.show({
      title: isHost ? 'Cancel round?' : 'Leave round?',
      subtitle: isHost
        ? 'This deletes the round for everyone.'
        : 'Your recorded scores stay with the round.',
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

  if (!round)
    return (
      <ScreenContainer surface="bone">
        <Pressable onPress={() => router.replace('/(app)/(tabs)')} style={{ minHeight: 48 }}>
          <Text style={{ color: palette.ink, fontSize: 16 }}>← Back to Today</Text>
        </Pressable>
        <Text style={{ color: palette.ink, fontSize: 16 }}>
          {groupQ.isError ? 'Could not load this round.' : 'Loading round…'}
        </Text>
        {groupQ.isError && (
          <Pressable onPress={() => void groupQ.refetch()} style={{ minHeight: 48 }}>
            <Text style={{ color: palette.fairway, fontSize: 16 }}>Retry</Text>
          </Pressable>
        )}
      </ScreenContainer>
    );

  return (
    <ScreenContainer surface="bone">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: 120 }}
      >
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
          <Pressable onPress={manage === '1' ? () => router.back() : onLeave} hitSlop={8}>
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
              {manage === '1' ? 'DONE' : isHost ? 'CANCEL' : 'LEAVE'}
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
          {manage === '1' ? 'GROUP PLAYERS' : 'LOBBY'}
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 36,
            color: palette.ink,
            marginTop: 4,
          }}
        >
          Who’s playing?
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowCode((v) => !v)}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 16, color: palette.fairway }}>
            {showCode ? 'Hide join code' : 'Share a join code (optional)'}
          </Text>
        </Pressable>
        {showCode && (
          <>
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
          </>
        )}
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
            {canManage && p.user_id !== round.user_id && (
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  const { error } = await supabase
                    .from('round_players')
                    .delete()
                    .eq('round_id', id)
                    .eq('user_id', p.user_id);
                  if (error) Alert.alert('Could not remove player', error.message);
                  else await groupQ.refetch();
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 15, color: palette.clay }}>
                  Remove {p.profile?.display_name ?? 'player'}
                </Text>
              </Pressable>
            )}
          </View>
        ))}

        {selectedGame && canManage && (
          <View style={{ marginVertical: 16 }}>
            <Text style={{ color: palette.ink, fontFamily: fontFamily.display, fontSize: 24 }}>
              {GAME_RULES[selectedGame].title}
            </Text>
            <RulesButton game={selectedGame} surface="bone" />
            <Text style={{ color: palette.fairway, fontSize: 16, lineHeight: 23 }}>
              {selectedGame === 'skins'
                ? 'Add at least two players, then set up Skins below.'
                : 'Add your players and start the round. Record the winner from Games when the result is known.'}
            </Text>
          </View>
        )}

        {manage !== '1' && (!selectedGame || selectedGame === 'skins') && (
          <SkinsGamePanel
            roundId={id}
            setup={{ isHost: canManage, holeCount: round.hole_count ?? 18, players }}
          />
        )}

        {canManage ? (
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
                + ADD PLAYERS
              </Text>
            </Pressable>

            <Pressable
              onPress={onStart}
              disabled={
                (!round.invites_locked_at && !isHost) ||
                (joinedCount < 1 && !round.invites_locked_at) ||
                start.isPending
              }
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
                {round.invites_locked_at ? 'EDIT GROUP SCORES →' : 'START ROUND →'}
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
        onGuest={async (name) => {
          const { error } = await supabase.rpc('add_round_player', {
            p_round: id,
            p_guest_name: name,
          });
          if (error) throw error;
          await groupQ.refetch();
        }}
        onPick={async (userId) => {
          if (!session?.user.id) return;
          await invite.mutateAsync({
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
