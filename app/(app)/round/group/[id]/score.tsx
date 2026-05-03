import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ScoreNumeral } from '@/components/ScoreNumeral';
import { Topo } from '@/components/Topo';
import { NotesField } from '@/components/NotesField';
import { PlayerProgressStrip } from '@/components/PlayerProgressStrip';
import {
  useGroupRound,
  useFinishMySlice,
  useForceEndRound,
  useWithdrawFromRound,
} from '@/lib/queries/groupRounds';
import { useUpsertHoleScore } from '@/lib/queries/rounds';
import { useSession } from '@/lib/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';

export default function GroupScore() {
  const { id, hole: holeParam } = useLocalSearchParams<{ id: string; hole: string }>();
  const hole = parseInt(holeParam ?? '1', 10);
  const { session } = useSession();
  const meId = session?.user.id;

  const groupQ = useGroupRound(id);
  const upsert = useUpsertHoleScore();
  const finishMine = useFinishMySlice();
  const forceEnd = useForceEndRound();
  const withdraw = useWithdrawFromRound();

  const round = groupQ.data?.round;
  const players = groupQ.data?.players ?? [];
  const holes = groupQ.data?.holes ?? [];
  const me = players.find((p) => p.user_id === meId);
  const isHost = round?.user_id === meId;
  const totalHoles = round?.hole_count ?? 18;

  // Course holes scoped to MY tee (each player can be on different tees)
  const [courseHoles, setCourseHoles] = useState<Tables<'course_holes'>[]>([]);
  useEffect(() => {
    if (!round?.course_id || !me?.tee_box) return;
    void supabase
      .from('course_holes')
      .select('*')
      .eq('course_id', round.course_id)
      .eq('tee_box', me.tee_box)
      .then(({ data }) => setCourseHoles((data ?? []) as Tables<'course_holes'>[]));
  }, [round?.course_id, me?.tee_box]);

  const myHoles = useMemo(() => holes.filter((h) => h.player_id === meId), [holes, meId]);
  const courseHole = courseHoles.find((h) => h.hole_number === hole);
  const existing = myHoles.find((h) => h.hole_number === hole);
  const par = courseHole?.par ?? existing?.par ?? 4;

  const [score, setScore] = useState(par);
  useEffect(() => {
    setScore(existing?.score ?? par);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole, par]);

  // Debounced autosave
  useEffect(() => {
    if (!id || !meId) return;
    const t = setTimeout(() => {
      upsert.mutate({
        round_id: id,
        player_id: meId,
        hole_number: hole,
        score,
        par,
        putts: null,
        fairway_hit: null,
        gir: null,
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, hole, par, id, meId]);

  const onAdvance = () => {
    if (!id) return;
    if (hole >= totalHoles) {
      onFinishMine();
    } else {
      router.setParams({ hole: String(hole + 1) });
    }
  };

  const onFinishMine = () => {
    if (!id || !meId) return;
    Alert.alert(
      'Finish your round?',
      "You'll be locked out of further scoring on this round.",
      [
        { text: 'Keep playing', style: 'cancel' as const },
        {
          text: 'Finish',
          onPress: async () => {
            await finishMine.mutateAsync({ roundId: id, userId: meId });
            router.replace({ pathname: '/round/[id]', params: { id } });
          },
        },
      ],
    );
  };

  const onMore = () => {
    if (!id || !meId) return;
    type Btn = { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void };
    const buttons: Btn[] = [{ text: 'Cancel', style: 'cancel' }];
    if (isHost) {
      buttons.push({
        text: 'End round for everyone',
        style: 'destructive',
        onPress: async () => {
          await forceEnd.mutateAsync({ roundId: id });
          router.replace({ pathname: '/round/[id]', params: { id } });
        },
      });
    }
    buttons.push({
      text: 'Withdraw',
      style: 'destructive',
      onPress: async () => {
        await withdraw.mutateAsync({ roundId: id, userId: meId });
        router.replace('/(app)/(tabs)');
      },
    });
    Alert.alert('Round options', undefined, buttons);
  };

  if (!round || !me) return null;

  const padded = String(hole).padStart(2, '0');
  const totalPadded = String(totalHoles).padStart(2, '0');

  return (
    <ScreenContainer>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.18 }}
      >
        <Topo seed={`${id}-h${hole}`} width={400} height={900} stroke={palette.bone + '22'} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Pressable onPress={onMore} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 18, color: palette.bone, opacity: 0.8 }}>
              ⋯
            </Text>
          </Pressable>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.18,
                color: palette.bone,
                opacity: 0.5,
                textTransform: 'uppercase',
              }}
            >
              GROUP ROUND
            </Text>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.bone }}>
              {padded}/{totalPadded}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <PlayerProgressStrip players={players} holes={holes} meId={meId} />
        </View>

        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.18,
            color: palette.bone,
            opacity: 0.7,
            textTransform: 'uppercase',
            marginTop: 32,
          }}
        >
          HOLE {padded} · PAR {par}
        </Text>

        <View
          style={{
            alignItems: 'center',
            marginTop: 32,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 32,
          }}
        >
          <Pressable
            onPress={() => setScore((s) => Math.max(1, s - 1))}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 0.5,
              borderColor: palette.bone + '40',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>−</Text>
          </Pressable>
          <ScoreNumeral value={score} size={120} color={palette.bone} />
          <Pressable
            onPress={() => setScore((s) => Math.min(20, s + 1))}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 0.5,
              borderColor: palette.bone + '40',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>+</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 32, borderTopWidth: 0.5, borderTopColor: palette.bone + '22' }}>
          <NotesField
            value={me.notes ?? ''}
            onChange={(t) => {
              if (!id || !meId) return;
              void supabase
                .from('round_players')
                .update({ notes: t || null })
                .eq('round_id', id)
                .eq('user_id', meId);
            }}
            surface="ink"
          />
        </View>

        <Pressable
          onPress={onAdvance}
          style={{
            marginTop: 32,
            backgroundColor: palette.brass,
            paddingVertical: 16,
            alignItems: 'center',
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
            {hole >= totalHoles ? 'FINISH MY SLICE →' : `HOLE ${hole + 1} →`}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
