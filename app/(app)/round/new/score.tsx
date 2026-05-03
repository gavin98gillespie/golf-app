import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Datum } from '@/components/Datum';
import { ScoreNumeral } from '@/components/ScoreNumeral';
import { Topo } from '@/components/Topo';
import { palette, fontFamily, deltaLabel } from '@/theme/linksman';
import { supabase, type Tables } from '@/lib/supabase';
import { useUpsertHoleScore, useRoundHoles } from '@/lib/queries/rounds';

type RoundWithCourse = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count'> | null;
};

type FairwayCategory = 'fairway' | 'rough' | 'sand' | 'water' | null;

export default function HoleEntry() {
  const { roundId, hole: holeParam } = useLocalSearchParams<{
    roundId: string;
    hole: string;
  }>();
  const hole = parseInt(holeParam ?? '1', 10);

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

  const courseHolesQ = useQuery({
    queryKey: ['course_holes', roundQ.data?.course_id, roundQ.data?.tee_box],
    queryFn: async () => {
      if (!roundQ.data) return [];
      const { data, error } = await supabase
        .from('course_holes')
        .select('*')
        .eq('course_id', roundQ.data.course_id)
        .eq('tee_box', roundQ.data.tee_box);
      if (error) throw error;
      return (data ?? []) as Tables<'course_holes'>[];
    },
    enabled: !!roundQ.data,
  });

  const roundHolesQ = useRoundHoles(roundId);
  const upsert = useUpsertHoleScore();

  const totalHoles = roundQ.data?.courses?.hole_count ?? 18;
  const courseHole = courseHolesQ.data?.find((h) => h.hole_number === hole);
  const existingHole = roundHolesQ.data?.find((h) => h.hole_number === hole);

  const initialPar = courseHole?.par ?? existingHole?.par ?? 4;
  const initialScore = existingHole?.score ?? initialPar;
  const [par, setPar] = useState(initialPar);
  const [score, setScore] = useState(initialScore);
  const [fairwayCategory, setFairwayCategory] = useState<FairwayCategory>(
    existingHole?.fairway_hit === true ? 'fairway' : null,
  );
  const [putts, setPutts] = useState<number>(existingHole?.putts ?? 2);
  const [gir, setGir] = useState<boolean | null>(existingHole?.gir ?? null);

  // Re-sync local state ONLY when navigating to a different hole. We deliberately
  // don't re-sync on roundHolesQ.data changes — that would race with the user's
  // next tap and revert in-progress edits. (Phase 2.1 fix)
  useEffect(() => {
    const eh = roundHolesQ.data?.find((h) => h.hole_number === hole);
    const ch = courseHolesQ.data?.find((h) => h.hole_number === hole);
    const newPar = ch?.par ?? eh?.par ?? 4;
    setPar(newPar);
    setScore(eh?.score ?? newPar);
    setFairwayCategory(eh?.fairway_hit === true ? 'fairway' : null);
    setPutts(eh?.putts ?? 2);
    setGir(eh?.gir ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole]);

  // Debounced autosave: writes round_holes whenever any tracked field changes.
  useEffect(() => {
    if (!roundId) return;
    const t = setTimeout(() => {
      upsert.mutate({
        round_id: roundId,
        hole_number: hole,
        score,
        par,
        putts,
        fairway_hit: fairwayCategory === 'fairway' ? true : fairwayCategory == null ? null : false,
        gir,
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, par, hole, roundId, fairwayCategory, putts, gir]);

  // Telemetry: holes BEFORE the current one
  const telemetry = useMemo(() => {
    const scored = roundHolesQ.data ?? [];
    const prior = scored.filter((h) => h.hole_number < hole);
    const priorScore = prior.reduce((a, h) => a + h.score, 0);
    const priorPar = prior.reduce((a, h) => a + h.par, 0);
    const totalScore = priorScore + score;
    const totalPar = priorPar + par;
    const diff = totalScore - totalPar;
    const vsPar = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
    const totalCoursePar = (courseHolesQ.data ?? []).reduce((a, h) => a + h.par, 0) || 72;
    const projected = totalCoursePar + diff;
    return { thru: hole, totalScore, vsPar, projected };
  }, [roundHolesQ.data, courseHolesQ.data, hole, score, par]);

  const isLast = hole >= totalHoles;
  const nextHole = hole + 1;
  const nextHoleData = courseHolesQ.data?.find((h) => h.hole_number === nextHole);
  const nextPar = nextHoleData?.par ?? 4;
  const padded = String(hole).padStart(2, '0');
  const totalPadded = String(totalHoles).padStart(2, '0');

  const advance = () => {
    if (isLast) {
      router.replace({ pathname: '/round/new/summary', params: { roundId } });
    } else {
      router.setParams({ hole: String(nextHole) });
    }
  };

  const exitRound = () => {
    router.replace('/(app)/(tabs)');
  };

  const delta = score - par;
  const deltaTextColor = delta < 0 ? palette.sage : delta > 1 ? palette.clay : palette.bone + '99';

  const yardage = courseHole?.yardage ?? null;

  return (
    <ScreenContainer>
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

      <View style={{ flex: 1, paddingTop: 8 }}>
        {/* Top row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Pressable onPress={exitRound}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                color: palette.bone,
                opacity: 0.7,
              }}
            >
              ‹ exit round
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

        {/* Hole metadata */}
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

        {/* PAR hero */}
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

        {/* Par picker when course hole missing */}
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

        {/* Telemetry strip */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 28,
          }}
        >
          <Datum label="THRU" value={telemetry.thru} color={palette.bone} />
          <Datum label="STROKES" value={telemetry.totalScore} color={palette.bone} />
          <Datum label="VS PAR" value={telemetry.vsPar} color={palette.bone} />
          <Datum label="PROJ" value={telemetry.projected} color={palette.bone} align="right" />
        </View>

        {/* Score stepper */}
        <View style={{ marginTop: 48, alignItems: 'center' }}>
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 32,
              marginTop: 18,
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
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>
                −
              </Text>
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
            {deltaLabel(delta)}
          </Text>
        </View>

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
            {isLast ? 'FINISH ROUND →' : `HOLE ${nextHole} · PAR ${nextPar} →`}
          </Text>
        </Pressable>

        {/* Detail chips */}
        <View style={{ marginTop: 24, flexDirection: 'row', gap: 8 }}>
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

        {/* Putts + GIR */}
        <View
          style={{
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 9 * 0.18,
                color: palette.bone,
                opacity: 0.55,
                textTransform: 'uppercase',
              }}
            >
              PUTTS
            </Text>
            <Pressable onPress={() => setPutts((p) => Math.max(0, p - 1))}>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 18, color: palette.bone }}>
                −
              </Text>
            </Pressable>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 24,
                color: palette.bone,
                minWidth: 24,
                textAlign: 'center',
              }}
            >
              {putts}
            </Text>
            <Pressable onPress={() => setPutts((p) => Math.min(10, p + 1))}>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 18, color: palette.bone }}>
                +
              </Text>
            </Pressable>
          </View>
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
      </View>
    </ScreenContainer>
  );
}
