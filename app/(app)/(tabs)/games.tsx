import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [choosingRound, setChoosingRound] = useState(false);
  const { session } = useSession();
  const userId = session?.user.id;
  const rounds = useQuery({
    queryKey: ['games', 'roundPicker', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('round_players')
        .select('round_id, rounds!inner(id,is_group,invites_locked_at,played_at,hole_count)')
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
      if (userId) void refetch();
    }, [refetch, userId]),
  );
  const openRound = (id: string, started: boolean) =>
    router.push({
      pathname: started ? '/round/group/[id]/game' : '/round/group/[id]/lobby',
      params: { id, ...(selected ? { game: selected } : {}) },
    });
  const continueRound = () => {
    if (rounds.data?.length === 1) {
      const round = rounds.data[0]!;
      openRound(round.id, !!round.invites_locked_at);
    } else setChoosingRound(true);
  };
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 24 }}>
        {selected && (
          <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={s.back}>
            <Text style={s.detail}>← Games</Text>
          </Pressable>
        )}
        <Text accessibilityRole="header" style={s.title}>
          {selected ? GAME_RULES[selected].title : 'Games'}
        </Text>
        {selected ? (
          <RulesButton game={selected} />
        ) : (
          <View>
            {(Object.keys(GAME_RULES) as GameKind[]).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => setSelected(key)}
                style={s.row}
              >
                <Text style={s.rowTitle}>{GAME_RULES[key].title}</Text>
                <Text style={s.arrow}>↗</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/ledger')}
              style={[s.row, { marginTop: 24, borderBottomWidth: 0 }]}
            >
              <Text style={s.detail}>Rivalry ledger</Text>
              <Text style={s.arrow}>→</Text>
            </Pressable>
          </View>
        )}
        <View style={{ flex: 1, minHeight: 36 }} />
        {rounds.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void refetch()} style={s.secondary}>
            <Text style={s.detail}>Retry loading rounds</Text>
          </Pressable>
        ) : (
          !!rounds.data?.length && (
            <Pressable accessibilityRole="button" onPress={continueRound} style={s.secondary}>
              <Text style={s.detail}>{selected ? 'Use existing round' : 'Continue round'}</Text>
            </Pressable>
          )
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
          <Text style={s.startText}>Start a round →</Text>
        </Pressable>
      </ScrollView>
      <Modal
        visible={choosingRound}
        transparent
        animationType="slide"
        onRequestClose={() => setChoosingRound(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: palette.ink + 'BB' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close round picker"
            onPress={() => setChoosingRound(false)}
            style={{ flex: 1 }}
          />
          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: palette.ink,
              maxHeight: '70%',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 24,
            }}
          >
            <View style={s.row}>
              <Text style={s.rowTitle}>Choose a round</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setChoosingRound(false)}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={s.detail}>Done</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {rounds.data?.map((round, i) => (
                <Pressable
                  key={round.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setChoosingRound(false);
                    openRound(round.id, !!round.invites_locked_at);
                  }}
                  style={s.row}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>Round {i + 1}</Text>
                    <Text style={s.detail}>
                      {round.played_at} · {round.hole_count ?? 18} holes
                    </Text>
                  </View>
                  <Text style={s.arrow}>→</Text>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  title: {
    fontFamily: fontFamily.display,
    color: palette.bone,
    fontSize: 38,
    marginTop: 12,
    marginBottom: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 22,
    borderBottomWidth: 0.5,
    borderColor: palette.bone + '25',
  },
  rowTitle: { flexShrink: 1, fontFamily: fontFamily.display, fontSize: 24, color: palette.bone },
  detail: { color: palette.sage, fontSize: 16, lineHeight: 24 },
  arrow: { color: palette.brass, fontSize: 22 },
  back: { minHeight: 44, justifyContent: 'center' },
  secondary: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: palette.sage + '66',
    borderRadius: 26,
  },
  start: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  startText: { fontSize: 17, color: palette.ink },
});
