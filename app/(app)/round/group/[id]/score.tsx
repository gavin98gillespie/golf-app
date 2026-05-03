import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ScoreNumeral } from '@/components/ScoreNumeral';
import { Topo } from '@/components/Topo';
import { Datum } from '@/components/Datum';
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
import { palette, fontFamily, deltaLabel } from '@/theme/linksman';

type FairwayCategory = 'fairway' | 'rough' | 'sand' | 'water' | null;

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
  const yardage = courseHole?.yardage ?? null;

  const [par, setPar] = useState(4);
  const [score, setScore] = useState(4);
  const [fairwayCategory, setFairwayCategory] = useState<FairwayCategory>(null);
  const [gir, setGir] = useState<boolean | null>(null);

  // Reset state when navigating between holes (or when course/holes data first arrives)
  useEffect(() => {
    const eh = holes.find((h) => h.hole_number === hole && h.player_id === meId);
    const ch = courseHoles.find((h) => h.hole_number === hole);
    const newPar = ch?.par ?? eh?.par ?? 4;
    setPar(newPar);
    setScore(eh?.score ?? newPar);
    setFairwayCategory(
      eh?.fairway_hit === true ? 'fairway' : eh?.fairway_hit === false ? 'rough' : null,
    );
    setGir(eh?.gir ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole, courseHoles.length, meId]);

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
        fairway_hit:
          fairwayCategory === 'fairway' ? true : fairwayCategory == null ? null : false,
        gir,
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, par, hole, id, meId, fairwayCategory, gir]);

  const telemetry = useMemo(() => {
    const completed = myHoles.filter((h) => h.hole_number !== hole);
    const totalScore = completed.reduce((s, h) => s + h.score, 0) + score;
    const totalPar = completed.reduce((s, h) => s + h.par, 0) + par;
    const diff = totalScore - totalPar;
    const vsPar = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
    const totalCoursePar = (courseHoles ?? []).reduce((a, h) => a + h.par, 0) || 72;
    const projected = totalCoursePar + diff;
    return { thru: hole, totalScore, vsPar, projected };
  }, [myHoles, courseHoles, hole, score, par]);

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
  const delta = score - par;
  const deltaTextColor = delta < 0 ? palette.sage : delta > 1 ? palette.clay : palette.bone + '99';
  const isLast = hole >= totalHoles;
  const nextHole = hole + 1;
  const nextHoleData = courseHoles.find((h) => h.hole_number === nextHole);
  const nextPar = nextHoleData?.par ?? 4;

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
          HOLE {padded}
          {yardage ? ` · ${yardage} Y` : ''}
        </Text>

        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 80,
            letterSpacing: -80 * 0.04,
            color: palette.bone,
            marginTop: 4,
            lineHeight: 80 * 0.95,
          }}
        >
          PAR {par}
        </Text>

        {!courseHole ? (
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
            {[3, 4, 5].map((p) => {
              const active = par === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPar(p)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    borderWidth: active ? 1 : 0.5,
                    borderColor: active ? palette.bone : palette.bone + '40',
                    borderRadius: 2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 11,
                      letterSpacing: 11 * 0.16,
                      color: palette.bone,
                      textTransform: 'uppercase',
                    }}
                  >
                    PAR {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 }}>
          <Datum label="THRU" value={telemetry.thru} color={palette.bone} />
          <Datum label="STROKES" value={telemetry.totalScore} color={palette.bone} />
          <Datum label="VS PAR" value={telemetry.vsPar} color={palette.bone} />
          <Datum label="PROJ" value={telemetry.projected} color={palette.bone} align="right" />
        </View>

        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              letterSpacing: 11 * 0.18,
              color: palette.bone,
              opacity: 0.55,
              textTransform: 'uppercase',
            }}
          >
            STROKES THIS HOLE
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 18 }}>
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
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              letterSpacing: 11 * 0.18,
              color: deltaTextColor,
              marginTop: 12,
              textTransform: 'uppercase',
            }}
          >
            {deltaLabel(delta, par, score)}
          </Text>
        </View>

        <Pressable
          onPress={onAdvance}
          style={{
            marginTop: 28,
            backgroundColor: palette.sage,
            paddingVertical: 16,
            alignItems: 'center',
            borderRadius: 4,
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
            {isLast ? 'FINISH MY SLICE →' : `HOLE ${nextHole} · PAR ${nextPar} →`}
          </Text>
        </Pressable>

        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 9,
              letterSpacing: 9 * 0.18,
              color: palette.bone,
              opacity: 0.55,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            DRIVE LANDED IN · OPTIONAL
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['fairway', 'rough', 'sand', 'water'] as const).map((cat) => {
              const active = fairwayCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFairwayCategory((prev) => (prev === cat ? null : cat))}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderWidth: active ? 1 : 0.5,
                    borderColor: active ? palette.bone : palette.bone + '40',
                    backgroundColor: active ? palette.bone + '10' : 'transparent',
                    alignItems: 'center',
                    borderRadius: 2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 11,
                      letterSpacing: 11 * 0.16,
                      color: palette.bone,
                      textTransform: 'uppercase',
                    }}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => setGir((g) => (g == null ? true : g ? false : null))}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: gir === true ? palette.sage : palette.bone,
                textTransform: 'uppercase',
              }}
            >
              GIR · {gir == null ? '—' : gir ? 'YES' : 'NO'}
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 24, borderTopWidth: 0.5, borderTopColor: palette.bone + '22' }}>
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
      </ScrollView>
    </ScreenContainer>
  );
}
