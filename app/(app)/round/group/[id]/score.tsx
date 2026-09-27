import { AcePhotoPrompt } from '@/components/RoundPhotos';
import { ScoreSaveStatus } from '@/components/ScoreSaveStatus';
import { HoleScorecard } from '@/components/HoleScorecard';
import { Topo } from '@/components/Topo';
import { scorecardTotals, nextUnscoredPlayer } from '@/lib/games/scorecard';
import { RoundGames, RoundBrass } from '@/components/RoundGames';
import { isGameKind } from '@/lib/gameRules';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { NotesField } from '@/components/NotesField';
import { useGroupRound, type GroupRoundPlayer } from '@/lib/queries/groupRounds';
import { useScoreDraft } from '@/lib/hooks/useScoreDraft';
import { useSession } from '@/lib/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';
import { fontFamily, palette } from '@/theme/linksman';

type Save = (confirm?: boolean) => Promise<boolean>;
export default function GroupScore() {
  const {
    id,
    hole: holeParam,
    game,
    games,
  } = useLocalSearchParams<{ id: string; hole?: string; game?: string; games?: string }>();
  const hole = Math.max(1, Number(holeParam) || 1);
  const group = useGroupRound(id);
  const { session } = useSession();
  const qc = useQueryClient();
  const [saves] = useState(() => new Map<string, Save>());
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [hole]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const advancing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);
  const round = group.data?.round;
  const players = useMemo(
    () => group.data?.players.filter((p) => p.status === 'joined' || p.status === 'finished') ?? [],
    [group.data],
  );
  const activePlayer = players.find((p) => p.user_id === selectedPlayer) ?? players[0];
  const recorded = new Set(
    (group.data?.holes ?? []).filter((h) => h.hole_number === hole).map((h) => h.player_id),
  );
  const nextPlayerId = nextUnscoredPlayer(
    players.map((p) => p.user_id),
    activePlayer?.user_id ?? '',
    recorded,
  );
  const nextPlayer = players.find((p) => p.user_id === nextPlayerId);
  const total = round?.hole_count ?? 18;
  const courseHoles = useQuery({
    queryKey: ['course_holes_group', round?.course_id],
    enabled: !!round?.course_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_holes')
        .select('*')
        .eq('course_id', round!.course_id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const pars = useQuery({
    queryKey: ['roundPars', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_round_pars', { p_round: id });
      if (error) throw error;
      return data as Record<string, number>;
    },
    refetchInterval: 5000,
  });
  const changePar = async (par: number) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await flush())) return;
      const { error } = await supabase.rpc('set_group_hole_par', {
        p_round: id,
        p_hole: hole,
        p_par: par,
      });
      if (error) throw error;
      await Promise.all([pars.refetch(), group.refetch()]);
      refreshSummaries();
    } catch (error) {
      Alert.alert('Could not change par', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const canEdit =
    round?.user_id === session?.user.id || players.some((p) => p.user_id === session?.user.id);
  const flush = async (confirm = false) => {
    if (saves.size !== players.length) return false;
    const results = await Promise.all(Array.from(saves.values()).map((save) => save(confirm)));
    return results.every(Boolean);
  };
  const refreshSummaries = () => {
    for (const key of [
      'round',
      'rounds',
      'today',
      'feed',
      'stats',
      'weekly_summary',
      'achievements',
      'user_recent_rounds',
      'profile_rounds_count',
      'skins',
      'brassLedger',
    ]) {
      void qc.invalidateQueries({ queryKey: [key] });
    }
  };
  const go = async (next: number) => {
    if (busy) return;
    setBusy(true);
    try {
      if (await flush()) router.setParams({ hole: String(next) });
    } finally {
      setBusy(false);
    }
  };
  const next = async () => {
    if (advancing.current || !activePlayer) return;
    advancing.current = true;
    setBusy(true);
    try {
      if (!(await saves.get(activePlayer.user_id)?.(true))) return;
      if (!(await flush(false))) return;
      const fresh = await group.refetch();
      if (fresh.error) throw fresh.error;
      const saved = new Set(
        (fresh.data?.holes ?? []).filter((h) => h.hole_number === hole).map((h) => h.player_id),
      );
      const pending = nextUnscoredPlayer(
        players.map((p) => p.user_id),
        activePlayer.user_id,
        saved,
      );
      if (pending) {
        setSelectedPlayer(pending);
        scroll.current?.scrollTo({ y: 0, animated: false });
        return;
      }
      setSelectedPlayer(null);
      if (hole < total) {
        router.setParams({ hole: String(hole + 1) });
        return;
      }
      const { error } = await supabase.rpc('finish_group_round', { p_round: id });
      if (error) throw error;
      await Promise.all(
        [
          'groupRound',
          'round',
          'rounds',
          'feed',
          'today',
          'stats',
          'achievements',
          'weekly_summary',
          'user_recent_rounds',
          'profile_rounds_count',
          'skins',
          'brassLedger',
        ].map((key) => qc.invalidateQueries({ queryKey: [key] })),
      );
      router.dismissTo({ pathname: '/round/[id]', params: { id } });
    } catch (e) {
      Alert.alert(
        'Could not finish the group round',
        (e as { message?: string }).message ?? 'Please try again.',
      );
    } finally {
      advancing.current = false;
      setBusy(false);
    }
  };
  const clear = async (player: string) => {
    if (!(await flush())) return;
    const { error } = await supabase
      .from('round_holes')
      .delete()
      .eq('round_id', id)
      .eq('player_id', player)
      .eq('hole_number', hole);
    if (error) {
      Alert.alert('Could not clear score', error.message);
      return;
    }
    await group.refetch();
    setReset((n) => n + 1);
  };
  return (
    <ScreenContainer>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
        <Topo seed={`${id}-h${hole}`} width={400} height={900} stroke={palette.bone + '22'} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Pressable
              accessibilityRole="button"
              style={s.button}
              onPress={async () => {
                if (group.isError || courseHoles.isError || pars.isError || (await flush())) {
                  refreshSummaries();
                  router.dismissTo({ pathname: '/round/[id]', params: { id } });
                }
              }}
            >
              <Text style={s.eyebrow}>‹ ROUND</Text>
            </Pressable>
            <Text style={s.progress}>
              {String(hole).padStart(2, '0')}/{String(total).padStart(2, '0')}
            </Text>
          </View>
          {group.isError || courseHoles.isError || pars.isError ? (
            <Pressable
              style={s.button}
              onPress={() => {
                void group.refetch();
                void courseHoles.refetch();
                void pars.refetch();
              }}
            >
              <Text style={s.link}>Could not load round. Retry</Text>
            </Pressable>
          ) : group.isPending ? (
            <Text style={s.small}>Loading…</Text>
          ) : !canEdit ? (
            <Text style={s.small}>Read only</Text>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              >
                {players.map((p) => (
                  <Pressable
                    key={p.user_id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: p.user_id === activePlayer?.user_id }}
                    disabled={busy}
                    onPress={async () => {
                      if (await flush()) setSelectedPlayer(p.user_id);
                    }}
                    style={[s.playerTab, p.user_id === activePlayer?.user_id && s.activeTab]}
                  >
                    <Text
                      style={[
                        s.tabName,
                        p.user_id === activePlayer?.user_id && { color: palette.ink },
                      ]}
                    >
                      {p.profile?.display_name ?? 'Player'}
                    </Text>
                    <Text
                      style={[
                        s.tabScore,
                        p.user_id === activePlayer?.user_id && { color: palette.fairway },
                      ]}
                    >
                      {group.data?.holes.find(
                        (h) => h.hole_number === hole && h.player_id === p.user_id,
                      )?.score ?? '—'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {players.map((p) => (
                <PlayerScore
                  key={`${p.user_id}:${hole}:${reset}`}
                  player={p}
                  roundId={id}
                  hole={hole}
                  active={p.user_id === activePlayer?.user_id}
                  totalHoles={total}
                  played={group.data?.holes.filter((h) => h.player_id === p.user_id) ?? []}
                  course={courseHoles.data?.filter((h) => h.tee_box === p.tee_box) ?? []}
                  ready={courseHoles.isSuccess && pars.isSuccess}
                  sharedPar={pars.data?.[String(hole)]}
                  onPar={(par) => void changePar(par)}
                  disabled={busy}
                  coursePar={
                    (
                      courseHoles.data?.find(
                        (h) => h.hole_number === hole && h.tee_box === p.tee_box,
                      ) ??
                      courseHoles.data?.find(
                        (h) => h.hole_number === hole && h.tee_box === 'default',
                      )
                    )?.par
                  }
                  existing={group.data?.holes.find(
                    (h) => h.player_id === p.user_id && h.hole_number === hole,
                  )}
                  register={saves}
                  clear={() => void clear(p.user_id)}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={busy || !activePlayer}
                style={[s.primary, busy && { opacity: 0.5 }]}
                onPress={() => void next()}
              >
                <Text style={s.action}>
                  {busy
                    ? 'SAVING…'
                    : nextPlayer
                      ? `NEXT · ${nextPlayer.profile?.display_name ?? 'PLAYER'} →`
                      : hole === total
                        ? 'FINISH ROUND →'
                        : `HOLE ${hole + 1} →`}
                </Text>
              </Pressable>
              <RoundGames
                key={`${id}:${game ?? ''}:${games ?? ''}`}
                roundId={id}
                players={players}
                canEdit={!!canEdit}
                holeCount={total}
                hole={hole}
                initialGame={isGameKind(game) ? game : undefined}
                autoOpen={games === '1'}
                beforeOpen={() => flush()}
              />
              <RoundBrass roundId={id} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingVertical: 12 }}
              >
                {Array.from({ length: total }, (_, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to hole ${i + 1}`}
                    disabled={busy}
                    onPress={() => void go(i + 1)}
                    style={[s.hole, hole === i + 1 && { borderColor: palette.brass }]}
                  >
                    <Text style={s.small}>{i + 1}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function PlayerScore({
  player,
  roundId,
  hole,
  ready,
  coursePar,
  sharedPar,
  onPar,
  disabled,
  existing,
  active,
  totalHoles,
  played,
  course,
  register,
  clear,
}: {
  player: GroupRoundPlayer;
  roundId: string;
  hole: number;
  ready: boolean;
  coursePar: number | undefined;
  sharedPar: number | undefined;
  onPar: (par: number) => void;
  disabled: boolean;
  existing: Tables<'round_holes'> | undefined;
  active: boolean;
  totalHoles: number;
  played: Tables<'round_holes'>[];
  course: Tables<'course_holes'>[];
  register: Map<string, Save>;
  clear: () => void;
}) {
  const editor = useScoreDraft({
    roundId,
    playerId: player.user_id,
    hole,
    ready,
    existing,
    coursePar,
    sharedPar,
  });
  const [details, setDetails] = useState(false);
  const [notes, setNotes] = useState(player.notes ?? '');
  const notesRef = useRef(notes);
  const savedNotes = useRef(player.notes ?? '');
  const saveDraft = editor.save;
  const save = useCallback<Save>(
    async (confirm = false) => {
      if (!(await saveDraft(confirm))) return false;
      if (notesRef.current !== savedNotes.current) {
        const { error } = await supabase
          .from('round_players')
          .update({ notes: notesRef.current || null })
          .eq('round_id', roundId)
          .eq('user_id', player.user_id);
        if (error) {
          Alert.alert('Notes not saved', error.message);
          return false;
        }
        savedNotes.current = notesRef.current;
      }
      return true;
    },
    [saveDraft, roundId, player.user_id],
  );
  useLayoutEffect(() => {
    register.set(player.user_id, save);
    return () => {
      register.delete(player.user_id);
    };
  }, [register, player.user_id, save]);
  const v = editor.value;
  if (!active) return null;
  if (!v)
    return (
      <View style={s.player}>
        <Text style={s.copy}>{player.profile?.display_name ?? 'Player'}</Text>
        <Pressable onPress={editor.retryRecovery} style={s.button}>
          <Text style={s.small}>
            {editor.recoveryError ? 'Could not restore score. Tap to retry.' : 'Loading score…'}
          </Text>
        </Pressable>
      </View>
    );
  const step = (label: string, value: number, down: () => void, up: () => void) => (
    <View style={s.controls}>
      <Text style={[s.copy, { flex: 1 }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${player.profile?.display_name} decrease ${label}`}
        style={s.step}
        onPress={down}
      >
        <Text style={s.number}>−</Text>
      </Pressable>
      <Text accessibilityLabel={`${label}: ${value}`} style={s.number}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${player.profile?.display_name} increase ${label}`}
        style={s.step}
        onPress={up}
      >
        <Text style={s.number}>+</Text>
      </Pressable>
    </View>
  );
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'}>
      <HoleScorecard
        hole={hole}
        par={v.par}
        score={v.score}
        editablePar
        yardage={course.find((h) => h.hole_number === hole)?.yardage}
        telemetry={scorecardTotals(hole, v.score, v.par, totalHoles, played, course)}
        onPar={onPar}
        onScore={editor.setScore}
      />
      {v.score === 1 && editor.status === 'saved' && (
        <AcePhotoPrompt
          key={`${player.user_id}:${hole}`}
          roundId={roundId}
          playerId={player.user_id}
          hole={hole}
        />
      )}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
        }}
      >
        <ScoreSaveStatus status={editor.status} retry={() => void editor.save(false)} />
        <Pressable accessibilityRole="button" onPress={() => setDetails(true)} style={s.button}>
          <Text style={s.eyebrow}>STATS & NOTES</Text>
        </Pressable>
      </View>
      <Modal
        visible={details}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetails(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
            }}
          >
            <Text style={s.name}>{player.profile?.display_name ?? 'Player'}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDetails(false)}
              style={s.button}
            >
              <Text style={s.link}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          >
            {v.putts === null ? (
              <Pressable style={s.button} onPress={() => editor.setPutts(2)}>
                <Text style={s.link}>Track putts</Text>
              </Pressable>
            ) : (
              <>
                {step(
                  'Putts',
                  v.putts,
                  () => editor.setPutts((n) => Math.max(0, (n ?? 0) - 1)),
                  () => editor.setPutts((n) => Math.min(20, (n ?? 0) + 1)),
                )}
                <Pressable style={s.button} onPress={() => editor.setPutts(null)}>
                  <Text style={s.small}>Clear putts</Text>
                </Pressable>
              </>
            )}
            <Text style={s.copy}>Green in regulation</Text>
            <View style={s.options}>
              {(
                [
                  ['Not tracked', null],
                  ['Yes', true],
                  ['No', false],
                ] as const
              ).map(([label, value]) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  onPress={() => editor.setGir(value)}
                  style={[s.option, v.gir === value && s.selected]}
                >
                  <Text style={s.link}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <NotesField
              value={notes}
              onChange={async (next) => {
                notesRef.current = next;
                setNotes(next);
                if (!(await save(false))) throw new Error('Please try saving the note again.');
              }}
            />
            {existing && (
              <Pressable accessibilityRole="button" style={s.button} onPress={clear}>
                <Text style={{ fontSize: 16, color: palette.clay }}>
                  Clear this hole’s score & stats
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  progress: { fontFamily: fontFamily.display, color: palette.bone, fontSize: 18 },
  playerTab: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: palette.bone + '33',
    borderRadius: 4,
  },
  activeTab: { backgroundColor: palette.bone },
  tabName: { fontSize: 16, color: palette.bone },
  tabScore: { fontFamily: fontFamily.mono, fontSize: 13, color: palette.sage },
  action: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    letterSpacing: 1.5,
    color: palette.ink,
    textAlign: 'center',
  },
  eyebrow: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: palette.sage,
    marginTop: 12,
    marginBottom: 8,
  },
  title: { fontFamily: fontFamily.display, fontSize: 36, color: palette.bone },
  copy: { fontSize: 16, lineHeight: 24, color: palette.bone, marginVertical: 6 },
  small: { fontSize: 14, lineHeight: 21, color: palette.sage, marginVertical: 6 },
  link: { fontSize: 16, color: palette.bone },
  button: { minHeight: 48, justifyContent: 'center', paddingVertical: 8 },
  primary: {
    minHeight: 52,
    backgroundColor: palette.sage,
    borderRadius: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  hole: {
    borderWidth: 0.5,
    borderColor: palette.bone + '33',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  player: { borderBottomWidth: 1, borderBottomColor: palette.bone + '33', paddingVertical: 18 },
  name: { fontFamily: fontFamily.display, fontSize: 24, color: palette.bone },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  step: {
    width: 48,
    height: 48,
    backgroundColor: palette.graphite,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: palette.bone + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontSize: 28, minWidth: 36, textAlign: 'center', color: palette.bone },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  option: { borderRadius: 22, minHeight: 44, padding: 12, backgroundColor: palette.graphite },
  selected: { backgroundColor: palette.fairway },
});
