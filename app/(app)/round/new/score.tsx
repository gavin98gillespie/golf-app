import { ScoreSaveStatus } from '@/components/ScoreSaveStatus';
import { scorecardTotals } from '@/lib/games/scorecard';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenContainer } from '@/components/ScreenContainer';
import { HoleScorecard } from '@/components/HoleScorecard';
import { Topo } from '@/components/Topo';
import { EagleCelebration } from '@/components/EagleCelebration';
import { palette, fontFamily } from '@/theme/linksman';
import { supabase, type Tables } from '@/lib/supabase';
import { useRoundHoles, useUpdateRoundNotes } from '@/lib/queries/rounds';
import { NotesField } from '@/components/NotesField';
import { useSession } from '@/lib/hooks/useSession';
import { useScoreDraft } from '@/lib/hooks/useScoreDraft';

type RoundWithCourse = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count'> | null;
};

export default function HoleEntry() {
  const { roundId, hole: holeParam } = useLocalSearchParams<{
    roundId: string;
    hole: string;
  }>();
  const hole = parseInt(holeParam ?? '1', 10);
  const { session } = useSession();
  const qc = useQueryClient();

  const [eagleVisible, setEagleVisible] = useState(false);
  const [eagleData, setEagleData] = useState<{
    holeNumber: number;
    par: number;
    lifetimeCount: number;
    isAce: boolean;
    isAlbatross: boolean;
  } | null>(null);
  const celebratedHoles = useRef<Set<number>>(new Set());

  const roundQ = useQuery({
    queryKey: ['round', roundId],
    queryFn: async () => {
      if (!roundId) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('*, courses(name, hole_count)')
        .eq('id', roundId)
        .single();
      if (error) throw error;
      return data as RoundWithCourse;
    },
    enabled: !!roundId,
  });

  const isEditMode = !!roundQ.data && roundQ.data.is_draft === false;

  const courseHolesQ = useQuery({
    queryKey: ['course_holes', roundQ.data?.course_id, roundQ.data?.tee_box],
    queryFn: async () => {
      if (!roundQ.data) return [];
      const { data, error } = await supabase
        .from('course_holes')
        .select('*')
        .eq('course_id', roundQ.data.course_id)
        .in('tee_box', [...new Set([roundQ.data.tee_box, 'default'])]);
      if (error) throw error;
      return (data ?? []) as Tables<'course_holes'>[];
    },
    enabled: !!roundQ.data,
  });

  const roundHolesQ = useRoundHoles(roundId);
  const updateRoundNotes = useUpdateRoundNotes();

  const totalHoles = roundQ.data?.hole_count ?? roundQ.data?.courses?.hole_count ?? 18;
  const courseHole =
    courseHolesQ.data?.find((h) => h.hole_number === hole && h.tee_box === roundQ.data?.tee_box) ??
    courseHolesQ.data?.find((h) => h.hole_number === hole && h.tee_box === 'default');
  const existingHole = roundHolesQ.data?.find(
    (h) => h.hole_number === hole && h.player_id === session?.user.id,
  );
  const editor = useScoreDraft({
    roundId,
    playerId: session?.user.id,
    hole,
    ready: roundQ.isSuccess && courseHolesQ.isSuccess && roundHolesQ.isSuccess,
    existing: existingHole,
    coursePar: courseHole?.par,
  });
  const { setPar, setScore, setGir } = editor;
  const { par = 4, score = 4, gir = null } = editor.value ?? {};

  const handleEagle = useCallback(
    async (
      holeNumber: number,
      holePar: number,
      flags: { isAce: boolean; isAlbatross: boolean },
    ) => {
      if (!session?.user.id) return;
      const { data: rounds } = await supabase
        .from('rounds')
        .select('id')
        .eq('user_id', session.user.id);
      if (!rounds || rounds.length === 0) {
        setEagleData({ holeNumber, par: holePar, lifetimeCount: 1, ...flags });
        setEagleVisible(true);
        return;
      }
      const { data: holes } = await supabase
        .from('round_holes')
        .select('score, par')
        .eq('player_id', session.user.id)
        .in(
          'round_id',
          rounds.map((r) => r.id),
        );
      const lifetime = (holes ?? []).filter((h) => h.score - h.par <= -2).length;
      setEagleData({ holeNumber, par: holePar, lifetimeCount: Math.max(lifetime, 1), ...flags });
      setEagleVisible(true);
    },
    [session],
  );

  const telemetry = useMemo(
    () =>
      scorecardTotals(
        hole,
        score,
        par,
        totalHoles,
        roundHolesQ.data ?? [],
        courseHolesQ.data ?? [],
      ),
    [hole, score, par, totalHoles, roundHolesQ.data, courseHolesQ.data],
  );

  const isLast = hole >= totalHoles;
  const nextHole = hole + 1;
  const nextHoleData = courseHolesQ.data?.find((h) => h.hole_number === nextHole);
  const nextPar = nextHoleData?.par ?? 4;
  const padded = String(hole).padStart(2, '0');
  const totalPadded = String(totalHoles).padStart(2, '0');

  const finishEdit = async () => {
    if (!roundQ.data || !(await editor.save(false))) return;
    const { data: holes, error: hErr } = await supabase
      .from('round_holes')
      .select('score, par')
      .eq('round_id', roundQ.data.id);
    if (hErr) {
      console.error('recompute totals fetch failed', hErr);
      return;
    }
    const total_score = (holes ?? []).reduce((s, h) => s + (h.score ?? 0), 0);
    const total_par = (holes ?? []).reduce((s, h) => s + (h.par ?? 0), 0);
    const { error: uErr } = await supabase
      .from('rounds')
      .update({ total_score, total_par })
      .eq('id', roundQ.data.id);
    if (uErr) {
      console.error('recompute totals update failed', uErr);
      return;
    }
    qc.invalidateQueries({ queryKey: ['round', roundQ.data.id] });
    qc.invalidateQueries({ queryKey: ['rounds'] });
    router.replace({ pathname: '/round/[id]', params: { id: roundQ.data.id } });
  };

  const advanceToNext = async () => {
    if (!(await editor.save())) return;
    if (isLast) {
      if (isEditMode) {
        void finishEdit();
      } else {
        router.replace({ pathname: '/round/new/summary', params: { roundId } });
      }
    } else {
      router.setParams({ hole: String(nextHole) });
    }
  };

  const advance = async () => {
    if (!(await editor.save())) return;
    if (isEditMode) {
      advanceToNext();
      return;
    }
    const delta = score - par;
    const isAce = par === 3 && score === 1;
    const isAlbatross = par - score >= 3;
    const isEagle = delta <= -2;
    if (isEagle && !celebratedHoles.current.has(hole)) {
      celebratedHoles.current.add(hole);
      void handleEagle(hole, par, { isAce, isAlbatross });
      return; // celebration's onSave will call advanceToNext
    }
    advanceToNext();
  };

  const exitRound = async () => {
    if (!(await editor.save(false))) return;
    router.replace('/(app)/(tabs)');
  };

  const yardage = courseHole?.yardage ?? null;

  if (!editor.value) {
    const failed =
      editor.recoveryError || roundQ.isError || courseHolesQ.isError || roundHolesQ.isError;
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
          {failed ? (
            <Pressable
              onPress={() => {
                editor.retryRecovery();
                void roundQ.refetch();
                void courseHolesQ.refetch();
                void roundHolesQ.refetch();
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

  return (
    <ScreenContainer>
      <ScoreSaveStatus status={editor.status} retry={() => void editor.save(false)} />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.18 }}
      >
        <Topo
          seed={`${roundId ?? 'r'}-h${hole}`}
          width={400}
          height={900}
          stroke={palette.bone + '22'}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {/* Top row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Pressable onPress={isEditMode ? () => void finishEdit() : exitRound} hitSlop={8}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                color: isEditMode ? palette.fairway : palette.bone,
                opacity: isEditMode ? 1 : 0.7,
                textTransform: isEditMode ? 'uppercase' : 'none',
                letterSpacing: isEditMode ? 11 * 0.16 : 0,
              }}
            >
              {isEditMode ? '‹ DONE EDITING' : '‹ exit round'}
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
              ROUND
            </Text>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 18,
                color: palette.bone,
              }}
            >
              {padded}/{totalPadded}
            </Text>
          </View>
        </View>

        {/* Hole jump bar (edit mode only) */}
        {isEditMode ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
            style={{ marginTop: 16, flexGrow: 0 }}
          >
            {Array.from({ length: totalHoles }, (_, i) => i + 1).map((h) => {
              const active = h === hole;
              return (
                <Pressable
                  key={h}
                  onPress={async () => {
                    if (await editor.save(false)) router.setParams({ hole: String(h) });
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 0.5,
                    borderColor: active ? palette.brass : palette.bone + '33',
                    backgroundColor: active ? palette.brass + '22' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 11,
                      color: active ? palette.brass : palette.bone,
                      opacity: active ? 1 : 0.7,
                    }}
                  >
                    {h}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <HoleScorecard
          hole={hole}
          par={par}
          score={score}
          yardage={yardage}
          editablePar
          telemetry={telemetry}
          onPar={setPar}
          onScore={setScore}
        />

        {/* Advance button */}
        <Pressable
          onPress={advance}
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
                ? 'DONE →'
                : 'FINISH ROUND →'
              : `HOLE ${nextHole} · PAR ${nextPar} →`}
          </Text>
        </Pressable>

        {/* GIR (full width, right aligned) */}
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
            value={roundQ.data?.notes ?? ''}
            onChange={(t) => {
              if (roundQ.data) updateRoundNotes.mutate({ roundId: roundQ.data.id, notes: t });
            }}
            surface="ink"
          />
        </View>
      </ScrollView>

      {eagleData ? (
        <EagleCelebration
          visible={eagleVisible}
          holeNumber={eagleData.holeNumber}
          par={eagleData.par}
          lifetimeCount={eagleData.lifetimeCount}
          kind={eagleData.isAce ? 'ace' : eagleData.isAlbatross ? 'albatross' : 'eagle'}
          onClose={() => setEagleVisible(false)}
          onSave={() => {
            setEagleVisible(false);
            advanceToNext();
          }}
        />
      ) : null}
    </ScreenContainer>
  );
}
