import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useActionSheet } from '@/components/ActionSheet';
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
import { useScoreDraft } from '@/lib/hooks/useScoreDraft';
import { useSession } from '@/lib/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';
import { palette, fontFamily, deltaLabel } from '@/theme/linksman';

export default function GroupScore() {
  const { id, hole: holeParam } = useLocalSearchParams<{ id: string; hole: string }>();
  const hole = parseInt(holeParam ?? '1', 10);
  const { session } = useSession();
  const meId = session?.user.id;

  const groupQ = useGroupRound(id);
  const finishMine = useFinishMySlice();
  const forceEnd = useForceEndRound();
  const withdraw = useWithdrawFromRound();
  const sheet = useActionSheet();

  const round = groupQ.data?.round;
  const players = groupQ.data?.players ?? [];
  const holes = useMemo(() => groupQ.data?.holes ?? [], [groupQ.data?.holes]);
  const me = players.find((p) => p.user_id === meId);
  const isHost = round?.user_id === meId;
  const totalHoles = round?.hole_count ?? 18;

  const courseHolesQ = useQuery({
    queryKey: ['course_holes', round?.course_id, me?.tee_box],
    enabled: !!round?.course_id && !!me?.tee_box,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_holes')
        .select('*')
        .eq('course_id', round!.course_id)
        .eq('tee_box', me!.tee_box);
      if (error) throw error;
      return (data ?? []) as Tables<'course_holes'>[];
    },
  });
  const courseHoles = useMemo(() => courseHolesQ.data ?? [], [courseHolesQ.data]);
  const myHoles = useMemo(() => holes.filter((h) => h.player_id === meId), [holes, meId]);
  const courseHole = courseHoles.find((h) => h.hole_number === hole);
  const existing = myHoles.find((h) => h.hole_number === hole);
  const yardage = courseHole?.yardage ?? null;
  const editor = useScoreDraft({
    roundId: id,
    playerId: meId,
    hole,
    ready: groupQ.isSuccess && courseHolesQ.isSuccess,
    existing,
    coursePar: courseHole?.par,
  });
  const { setPar, setScore, setFairwayCategory, setGir } = editor;
  const { par = 4, score = 4, fairwayCategory = null, gir = null } = editor.value ?? {};

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

  const isEditMode = me?.status === 'finished';

  const onAdvance = async () => {
    if (!id || !(await editor.save())) return;
    if (hole >= totalHoles) {
      if (isEditMode) {
        router.replace({ pathname: '/round/[id]', params: { id } });
      } else {
        onFinishMine();
      }
    } else {
      router.setParams({ hole: String(hole + 1) });
    }
  };

  const onFinishMine = () => {
    if (!id || !meId) return;
    sheet.show({
      title: 'Finish your round?',
      subtitle: 'Save your result. You can review and edit it afterward.',
      cancelLabel: 'Keep playing',
      actions: [
        {
          label: 'Finish',
          tone: 'sage',
          onPress: async () => {
            if (!(await editor.save())) return;
            await finishMine.mutateAsync({ roundId: id, userId: meId });
            router.replace({ pathname: '/round/[id]', params: { id } });
          },
        },
      ],
    });
  };

  const onMore = () => {
    if (!id || !meId) return;
    sheet.show({
      eyebrow: 'OPTIONS',
      title: 'Round options',
      actions: [
        ...(isHost
          ? [
              {
                label: 'End round for everyone',
                tone: 'destructive' as const,
                onPress: async () => {
                  if (!(await editor.save())) return;
                  await forceEnd.mutateAsync({ roundId: id });
                  router.replace({ pathname: '/round/[id]', params: { id } });
                },
              },
            ]
          : []),
        {
          label: 'Withdraw',
          tone: 'destructive' as const,
          onPress: async () => {
            if (!(await editor.save(false))) return;
            await withdraw.mutateAsync({ roundId: id, userId: meId });
            router.replace('/(app)/(tabs)');
          },
        },
      ],
    });
  };

  if (!round || !me || !editor.value) {
    const failed =
      editor.recoveryError || groupQ.isError || courseHolesQ.isError || (groupQ.isSuccess && !me);
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {failed ? (
            <Pressable
              onPress={() => {
                editor.retryRecovery();
                void groupQ.refetch();
                void courseHolesQ.refetch();
              }}
            >
              <Text style={{ color: palette.bone, fontSize: 18 }}>
                Could not load your score. Tap to retry.
              </Text>
            </Pressable>
          ) : (
            <ActivityIndicator color={palette.sage} accessibilityLabel="Loading your score" />
          )}
        </View>
      </ScreenContainer>
    );
  }

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
      <Pressable
        onPress={() => void editor.save(false)}
        accessibilityRole="button"
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: editor.status === 'error' ? palette.clay : palette.bone, fontSize: 16 }}
        >
          {editor.status === 'error'
            ? 'Not saved · Tap to retry'
            : editor.status === 'saving' || editor.status === 'unsaved'
              ? 'Saving score…'
              : editor.status === 'saved'
                ? 'Score saved'
                : 'Enter your score, then continue'}
        </Text>
      </Pressable>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.18 }}
      >
        <Topo seed={`${id}-h${hole}`} width={400} height={900} stroke={palette.bone + '22'} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Pressable onPress={onMore} hitSlop={8}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 18,
                color: palette.bone,
                opacity: 0.8,
              }}
            >
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
              accessibilityRole="button"
              accessibilityLabel="Subtract one stroke"
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
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>
                −
              </Text>
            </Pressable>
            <ScoreNumeral value={score} size={120} color={palette.bone} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add one stroke"
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
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>
                +
              </Text>
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
            {isLast
              ? isEditMode
                ? 'DONE EDITING →'
                : 'FINISH MY ROUND →'
              : `HOLE ${nextHole} · PAR ${nextPar} →`}
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
