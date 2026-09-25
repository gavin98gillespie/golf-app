import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GameRulesContent } from '@/components/GameRulesSheet';
import { GameEmblem } from '@/components/GameEmblem';
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
    enabled: !!userId && !!selected,
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
      if (userId && selected) void refetch();
    }, [refetch, userId, selected]),
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 24 }}
      >
        {selected && (
          <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={s.back}>
            <Text style={s.detail}>← Games</Text>
          </Pressable>
        )}
        <Text accessibilityRole="header" style={s.title}>
          {selected ? GAME_RULES[selected].title : 'Games'}
        </Text>
        {selected ? (
          <View style={s.scorecard}>
            <View style={s.cardHeader}>
              <Text style={s.cardLabel}>HOW TO PLAY</Text>
              <GameEmblem kind={selected} color={palette.fairway} size={30} />
            </View>
            <View style={{ paddingHorizontal: 18, paddingBottom: 20 }}>
              <GameRulesContent game={selected} inline />
            </View>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {(Object.keys(GAME_RULES) as GameKind[]).map((key) => (
              <GameTile
                key={key}
                kind={key}
                title={GAME_RULES[key].title}
                onPress={() => setSelected(key)}
              />
            ))}
            <View style={{ height: 4 }} />
            <GameTile kind="ledger" title="Rivalry ledger" onPress={() => router.push('/ledger')} />
          </View>
        )}
      </ScrollView>
      {selected && (
        <View style={s.actions}>
          {rounds.isError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void refetch()}
              style={s.secondary}
            >
              <Text style={s.detail}>Retry loading rounds</Text>
            </Pressable>
          ) : (
            !!rounds.data?.length && (
              <Pressable accessibilityRole="button" onPress={continueRound} style={s.secondary}>
                <GameEmblem kind="ledger" size={25} />
                <Text style={s.actionText}>Use existing round</Text>
              </Pressable>
            )
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/round/new/group-setup', params: { game: selected } })
            }
            style={s.start}
          >
            <View style={s.actionSeal}>
              <GameEmblem kind="round" color={palette.ink} size={26} />
            </View>
            <Text style={s.startText}>Start a round</Text>
          </Pressable>
        </View>
      )}
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
                  <GameEmblem kind="round" size={25} />
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
function GameTile({
  kind,
  title,
  onPress,
}: {
  kind: GameKind | 'ledger';
  title: string;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[s.tile, { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      <View style={s.emblem}>
        <GameEmblem kind={kind} />
      </View>
      <Text style={s.tileTitle}>{title}</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  title: {
    fontFamily: fontFamily.display,
    color: palette.bone,
    fontSize: 38,
    marginTop: 12,
    marginBottom: 24,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    minHeight: 80,
    padding: 14,
    borderRadius: 16,
    backgroundColor: palette.graphite,
    borderWidth: 0.5,
    borderColor: palette.brass + '44',
  },
  emblem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: palette.brass + '66',
    backgroundColor: palette.ink,
  },
  tileTitle: { flex: 1, fontFamily: fontFamily.display, fontSize: 24, color: palette.bone },
  scorecard: { backgroundColor: palette.bone, borderRadius: 12, overflow: 'hidden' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 18,
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderColor: palette.fairway,
  },
  cardLabel: {
    flexShrink: 1,
    fontFamily: fontFamily.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    color: palette.fairway,
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
  back: { minHeight: 44, justifyContent: 'center' },
  actions: {
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderTopWidth: 0.5,
    borderColor: palette.bone + '22',
  },
  secondary: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: palette.brass + '77',
    borderRadius: 14,
    backgroundColor: palette.graphite,
  },
  actionText: { flexShrink: 1, color: palette.bone, fontSize: 16 },
  start: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: palette.brass,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  actionSeal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: palette.ink + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { flexShrink: 1, fontSize: 17, color: palette.ink },
});
