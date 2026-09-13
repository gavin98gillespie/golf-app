import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { brass } from '@/components/SkinsGamePanel';
import { useBrassLedger } from '@/lib/queries/skins';
import { palette, fontFamily } from '@/theme/linksman';
export default function Ledger() {
  const query = useBrassLedger();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };
  const [selected, setSelected] = useState<string | null>(null);
  const rivals = new Map<string, { name: string; balance: number; games: Set<string> }>();
  for (const e of query.data ?? []) {
    const r = rivals.get(e.opponent) ?? { name: e.name, balance: 0, games: new Set<string>() };
    r.balance += e.change;
    r.games.add(e.round_id);
    rivals.set(e.opponent, r);
  }
  const rival = selected ? rivals.get(selected) : null;
  const history = new Map<
    string,
    {
      course: string;
      date: string;
      change: number;
      reversal: boolean;
      holes: string[];
      roundId: string;
      label: string | undefined;
      editor: string | undefined;
    }
  >();
  for (const e of query.data ?? []) {
    if (e.opponent !== selected) continue;
    const key = e.kind === 'manual' ? e.id : `${e.round_id}:${e.revision}:${e.kind}`;
    const row = history.get(key) ?? {
      course: e.course,
      roundId: e.round_id,
      label: e.label,
      editor: e.editor,
      date: e.created_at,
      change: 0,
      reversal: e.kind === 'reversal',
      holes: [] as string[],
    };
    row.change += e.change;
    row.holes.push(
      e.hole === 0
        ? 'No Brass awarded'
        : `Hole ${e.hole}: ${e.change > 0 ? '+' : ''}${brass(e.change)}`,
    );
    history.set(key, row);
  }
  return (
    <ScreenContainer surface="bone">
      <Pressable
        accessibilityRole="button"
        onPress={() => (selected ? setSelected(null) : router.back())}
        style={s.button}
      >
        <Text style={s.text}>← {selected ? 'All rivalries' : 'Back'}</Text>
      </Pressable>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <Text style={s.title}>{rival ? rival.name : 'Rivalry ledger'}</Text>
        <Text style={s.text}>Brass · your running results</Text>
        {query.isPending && <Text style={s.text}>Loading your rivalries…</Text>}
        {query.isError && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void query.refetch()}
            style={s.button}
          >
            <Text style={s.text}>Could not load the ledger. Tap to retry.</Text>
          </Pressable>
        )}
        {!query.isPending && !query.isError && rivals.size === 0 && (
          <>
            <Text style={[s.text, { marginTop: 32 }]}>
              Record a side game or finish a skins round to start your ledger. One scorekeeper can
              do it all.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/round/new/group-setup')}
              style={s.button}
            >
              <Text style={s.text}>Start a group round →</Text>
            </Pressable>
          </>
        )}
        {rival ? (
          <>
            <Text style={s.balance}>
              {rival.balance > 0 ? '+' : ''}
              {brass(rival.balance)} Brass
            </Text>
            <Text style={s.text}>
              Your net result against {rival.name}. Positive means you’ve won more Brass; negative
              means they have.
            </Text>
            {Array.from(history.entries()).map(([key, h]) => (
              <View style={s.row} key={key}>
                <Text style={s.text}>
                  {h.course} · {h.reversal ? 'Previous awards reversed' : (h.label ?? 'Skins')}
                </Text>
                <Text style={s.text}>
                  {new Date(h.date).toLocaleDateString()} · {h.change > 0 ? '+' : ''}
                  {brass(h.change)} Brass
                </Text>
                <Text style={s.small}>{h.holes.join(' · ')}</Text>
                {h.editor && <Text style={s.small}>Edited by {h.editor}</Text>}
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/round/group/[id]/game', params: { id: h.roundId } })
                  }
                  style={s.button}
                >
                  <Text style={s.text}>View or edit game →</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : (
          Array.from(rivals.entries()).map(([id, r]) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelected(id)}
              style={s.row}
              key={id}
            >
              <Text style={s.name}>{r.name}</Text>
              <Text style={s.text}>
                {r.balance > 0 ? '+' : ''}
                {brass(r.balance)} Brass · {r.games.size} {r.games.size === 1 ? 'game' : 'games'} →
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  title: { fontFamily: fontFamily.display, fontSize: 36, color: palette.ink, marginVertical: 12 },
  text: { fontSize: 16, lineHeight: 24, color: palette.ink, marginVertical: 4 },
  small: { fontSize: 14, lineHeight: 22, color: palette.fairway },
  button: { minHeight: 48, justifyContent: 'center', marginVertical: 8 },
  row: { paddingVertical: 20, borderBottomWidth: 0.5, borderBottomColor: palette.ink + '44' },
  name: { fontFamily: fontFamily.display, fontSize: 26, color: palette.ink },
  balance: {
    fontFamily: fontFamily.display,
    fontSize: 40,
    color: palette.fairway,
    marginVertical: 24,
  },
});
