import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const { id, hole: holeParam } = useLocalSearchParams<{ id: string; hole?: string }>();
  const hole = Math.max(1, Number(holeParam) || 1);
  const group = useGroupRound(id);
  const { session } = useSession();
  const qc = useQueryClient();
  const [saves] = useState(() => new Map<string, Save>());
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [hole]);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);
  const round = group.data?.round;
  const players = useMemo(
    () => group.data?.players.filter((p) => p.status === 'joined' || p.status === 'finished') ?? [],
    [group.data],
  );
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
    if (busy) return;
    setBusy(true);
    try {
      if (!(await flush(true))) return;
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Pressable
            accessibilityRole="button"
            style={s.button}
            onPress={async () => {
              if (group.isError || courseHoles.isError || (await flush())) {
                refreshSummaries();
                router.dismissTo({ pathname: '/round/[id]', params: { id } });
              }
            }}
          >
            <Text style={s.link}>← Round overview</Text>
          </Pressable>
          <Text style={s.title}>
            Hole {hole} <Text style={{ fontSize: 20 }}>of {total}</Text>
          </Text>
          <Text style={s.copy}>One scorekeeper. Everyone’s round.</Text>
          {group.isError || courseHoles.isError ? (
            <Pressable
              onPress={() => {
                void group.refetch();
                void courseHoles.refetch();
              }}
              style={s.button}
            >
              <Text style={s.link}>Could not load round. Tap to retry.</Text>
            </Pressable>
          ) : group.isPending ? (
            <Text style={s.copy}>Loading players…</Text>
          ) : !canEdit ? (
            <Text style={s.copy}>This round is read only.</Text>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginVertical: 16 }}
              >
                {Array.from({ length: total }, (_, i) => (
                  <Pressable
                    key={i}
                    accessibilityLabel={`Go to hole ${i + 1}`}
                    accessibilityRole="button"
                    disabled={busy}
                    style={[
                      s.hole,
                      { backgroundColor: hole === i + 1 ? palette.fairway : palette.graphite },
                    ]}
                    onPress={() => void go(i + 1)}
                  >
                    <Text style={s.link}>{i + 1}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {players.map((p) => (
                <PlayerScore
                  key={`${p.user_id}:${hole}:${reset}`}
                  player={p}
                  roundId={id}
                  hole={hole}
                  ready={courseHoles.isSuccess}
                  coursePar={
                    courseHoles.data?.find((h) => h.hole_number === hole && h.tee_box === p.tee_box)
                      ?.par
                  }
                  existing={group.data?.holes.find(
                    (h) => h.player_id === p.user_id && h.hole_number === hole,
                  )}
                  editorName={
                    group.data?.players.find(
                      (v) =>
                        v.user_id ===
                        group.data?.holes.find(
                          (h) => h.player_id === p.user_id && h.hole_number === hole,
                        )?.edited_by,
                    )?.profile?.display_name ?? null
                  }
                  register={saves}
                  clear={() => void clear(p.user_id)}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={busy || players.length === 0}
                style={[s.primary, { opacity: busy ? 0.5 : 1 }]}
                onPress={() => void next()}
              >
                <Text style={s.link}>
                  {busy
                    ? 'Saving…'
                    : hole === total
                      ? 'Finish group round'
                      : 'Save hole & continue →'}
                </Text>
              </Pressable>
              <Text style={s.small}>
                Saving this hole records the displayed scores for everyone. You can edit them
                anytime.
              </Text>
              <Pressable
                accessibilityRole="button"
                style={s.button}
                onPress={async () => {
                  if (await flush()) {
                    refreshSummaries();
                    router.push({ pathname: '/round/group/[id]/game', params: { id } });
                  }
                }}
              >
                <Text style={s.link}>Games & Brass →</Text>
              </Pressable>
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
  existing,
  editorName,
  register,
  clear,
}: {
  player: GroupRoundPlayer;
  roundId: string;
  hole: number;
  ready: boolean;
  coursePar: number | undefined;
  existing: Tables<'round_holes'> | undefined;
  editorName: string | null;
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
    <View style={s.player}>
      <Text style={s.name}>
        {player.profile?.display_name ?? 'Player'}
        {player.guest_id ? ' · Guest' : ''}
      </Text>
      {step(
        'Strokes',
        v.score,
        () => editor.setScore((n) => Math.max(1, n - 1)),
        () => editor.setScore((n) => Math.min(20, n + 1)),
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => void editor.save(false)}
        style={{ minHeight: 28, justifyContent: 'center' }}
      >
        <Text style={s.small}>
          {editor.status === 'error'
            ? 'Not saved · tap to retry'
            : editor.status === 'saving' || editor.status === 'unsaved'
              ? 'Saving…'
              : existing
                ? `Saved${editorName ? ` · edited by ${editorName}` : ''}`
                : 'Not recorded yet'}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setDetails((v) => !v)} style={s.button}>
        <Text style={s.link}>
          {details ? 'Hide stats & notes' : `Par ${v.par} · Stats & notes`}
        </Text>
      </Pressable>
      {details && (
        <>
          {step(
            'Par',
            v.par,
            () => editor.setPar((n) => Math.max(3, n - 1)),
            () => editor.setPar((n) => Math.min(6, n + 1)),
          )}
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
          <Text style={s.copy}>Fairway</Text>
          <View style={s.options}>
            {(
              [
                ['Not tracked', null],
                ['Hit', 'fairway'],
                ['Missed', 'rough'],
              ] as const
            ).map(([label, value]) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                onPress={() => editor.setFairwayCategory(value)}
                style={[s.option, v.fairwayCategory === value && s.selected]}
              >
                <Text style={s.link}>{label}</Text>
              </Pressable>
            ))}
          </View>
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
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  title: { fontFamily: fontFamily.display, fontSize: 36, color: palette.bone },
  copy: { fontSize: 16, lineHeight: 24, color: palette.bone, marginVertical: 6 },
  small: { fontSize: 14, lineHeight: 21, color: palette.sage, marginVertical: 6 },
  link: { fontSize: 16, color: palette.bone },
  button: { minHeight: 48, justifyContent: 'center', paddingVertical: 8 },
  primary: {
    minHeight: 52,
    backgroundColor: palette.fairway,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  hole: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  player: { borderBottomWidth: 1, borderBottomColor: palette.bone + '33', paddingVertical: 18 },
  name: { fontFamily: fontFamily.display, fontSize: 24, color: palette.bone },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  step: {
    width: 48,
    height: 48,
    backgroundColor: palette.graphite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontSize: 28, minWidth: 36, textAlign: 'center', color: palette.bone },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  option: { minHeight: 44, padding: 12, backgroundColor: palette.graphite },
  selected: { backgroundColor: palette.fairway },
});
