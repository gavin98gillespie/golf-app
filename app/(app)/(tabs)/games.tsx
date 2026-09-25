import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { RulesButton } from '@/components/GameRulesSheet';
import { GAME_RULES, type GameKind } from '@/lib/gameRules';
import { useSession } from '@/lib/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { fontFamily, palette } from '@/theme/linksman';

export default function Games() {
  const [selected, setSelected] = useState<GameKind | null>(null);
  const { session } = useSession();
  const userId = session?.user.id;
  const rounds = useQuery({
    queryKey: ['games', 'rounds', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('round_players')
        .select('round_id, rounds!inner(id,is_group,invites_locked_at,courses(name))')
        .eq('user_id', userId!)
        .eq('status', 'joined')
        .eq('rounds.is_group', true)
        .order('joined_at', { ascending: false });
      if (error) throw error;
      return data.map((p) => p.rounds);
    },
  });
  const { refetch } = rounds;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const openRound = (id: string, started: boolean) =>
    router.push({
      pathname: started ? '/round/group/[id]/game' : '/round/group/[id]/lobby',
      params: { id, ...(selected ? { game: selected } : {}) },
    });
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}>
        <Text style={s.eyebrow}>A LITTLE FRIENDLY COMPETITION</Text>
        <Text accessibilityRole="header" style={s.title}>
          Games
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/ledger')}
          style={s.ledger}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>Rivalry ledger</Text>
            <Text style={s.detail}>Your history. Your Brass. Your bragging rights.</Text>
          </View>
          <Text style={s.arrow}>↗</Text>
        </Pressable>
        {selected ? (
          <>
            <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={s.back}>
              <Text style={s.detail}>← All games</Text>
            </Pressable>
            <Text accessibilityRole="header" style={s.heading}>
              {GAME_RULES[selected].title}
            </Text>
            <Text style={s.detail}>{GAME_RULES[selected].summary}</Text>
            <RulesButton game={selected} />
            <Text style={[s.detail, { marginVertical: 16 }]}>
              {selected === 'skins'
                ? 'Choose a group round to set the Brass amount. Scores decide the winners automatically.'
                : 'Choose a group round to record a result. Pick the payer, winner, hole and Brass amount.'}
            </Text>
          </>
        ) : (
          <>
            <Text style={s.label}>PICK A GAME</Text>
            {(Object.keys(GAME_RULES) as GameKind[]).map((key, index) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => setSelected(key)}
                style={s.row}
              >
                <Text style={s.number}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{GAME_RULES[key].title}</Text>
                  <Text style={s.detail}>{GAME_RULES[key].summary}</Text>
                </View>
                <Text style={s.arrow}>→</Text>
              </Pressable>
            ))}
          </>
        )}
        <Text style={s.label}>{selected ? 'USE A GROUP ROUND' : 'YOUR ACTIVE GROUP ROUNDS'}</Text>
        {rounds.isPending && <Text style={s.detail}>Loading rounds…</Text>}
        {rounds.isError && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void rounds.refetch()}
            style={s.back}
          >
            <Text style={s.detail}>Could not load rounds. Tap to retry.</Text>
          </Pressable>
        )}
        {rounds.data?.map((round) => (
          <Pressable
            key={round.id}
            accessibilityRole="button"
            onPress={() => openRound(round.id, !!round.invites_locked_at)}
            style={s.row}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{round.courses?.name ?? 'Group round'}</Text>
              <Text style={s.detail}>
                {round.invites_locked_at ? 'Open games & Brass' : 'Add players & set up'}
              </Text>
            </View>
            <Text style={s.arrow}>→</Text>
          </Pressable>
        ))}
        {rounds.isSuccess && rounds.data.length === 0 && (
          <Text style={s.detail}>
            No active group round yet. One person can keep score for everyone, including guests.
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/round/new/group-setup',
              params: selected ? { game: selected } : {},
            })
          }
          style={s.start}
        >
          <Text style={s.startText}>Start a group round →</Text>
        </Pressable>
        <Text style={s.footnote}>
          Brass tracks the amount you agree on: 50 means 50 Brass. Match Play is coming later.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  eyebrow: { fontFamily: fontFamily.mono, fontSize: 10, letterSpacing: 1.1, color: palette.sage },
  title: {
    fontFamily: fontFamily.display,
    color: palette.bone,
    fontSize: 42,
    marginTop: 8,
    marginBottom: 24,
  },
  ledger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.brass,
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: palette.sage,
    marginTop: 28,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 19,
    borderBottomWidth: 0.5,
    borderColor: palette.bone + '28',
  },
  number: { fontFamily: fontFamily.mono, fontSize: 12, color: palette.brass },
  rowTitle: { fontFamily: fontFamily.display, fontSize: 23, color: palette.bone },
  detail: { color: palette.sage, fontSize: 15, lineHeight: 22, marginTop: 5 },
  arrow: { color: palette.brass, fontSize: 23 },
  back: { minHeight: 48, justifyContent: 'center', marginTop: 8 },
  heading: { fontFamily: fontFamily.display, fontSize: 30, color: palette.bone, marginTop: 16 },
  start: {
    minHeight: 52,
    backgroundColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 20,
  },
  startText: { fontSize: 17, color: palette.ink },
  footnote: { color: palette.sage, fontSize: 13, lineHeight: 20, marginTop: 16 },
});
