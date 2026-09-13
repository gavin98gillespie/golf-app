import { useState } from 'react';
import {
  Alert,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSkinsAction, useSkinsGame, type GameAction } from '@/lib/queries/skins';
import { palette, fontFamily } from '@/theme/linksman';
export const brass = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
type Setup = {
  isHost: boolean;
  holeCount: number;
  players: { user_id: string; profile: { display_name: string | null } | null; status: string }[];
};
export function SkinsGamePanel({
  roundId,
  setup,
  compact = false,
}: {
  roundId: string;
  setup?: Setup | undefined;
  compact?: boolean;
}) {
  const q = useSkinsGame(roundId);
  const mutation = useSkinsAction(roundId);
  const game = q.data;
  const [editing, setEditing] = useState(false);
  const [stake, setStake] = useState('1');
  const [mode, setMode] = useState<'gross' | 'net'>('gross');
  const [strokes, setStrokes] = useState<Record<string, string>>({});
  const [order, setOrder] = useState('');
  const players =
    setup?.players.filter((p) => p.status === 'joined' || p.status === 'finished') ?? [];
  const run = async (a: GameAction) => {
    try {
      Keyboard.dismiss();
      await mutation.mutateAsync(a);
      setEditing(false);
    } catch (e) {
      Alert.alert(
        'Could not save skins',
        (e as { message?: string }).message ?? 'Please try again.',
      );
    }
  };
  const button = (label: string, press: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={press}
      disabled={disabled || mutation.isPending}
      style={[s.button, { opacity: disabled || mutation.isPending ? 0.5 : 1 }]}
    >
      <Text style={s.text}>{label}</Text>
    </Pressable>
  );
  if (q.isPending)
    return setup ? (
      <View style={s.section}>
        <Text style={s.text}>Loading skins…</Text>
      </View>
    ) : null;
  if (q.isError)
    return (
      <View style={s.section}>{button('Could not load skins. Retry', () => void q.refetch())}</View>
    );
  if (compact) {
    if (!game || game.state === 'void') return null;
    return (
      <View style={s.section}>
        <Text style={s.title}>Skins · {game.state === 'settled' ? 'Saved' : 'Live'}</Text>
        <Text style={s.text}>
          {brass(game.stake)} Brass per skin · {game.result?.resolvedHoles ?? 0}/{game.hole_count}{' '}
          holes scored
        </Text>
      </View>
    );
  }
  const edit = () => {
    setMode(game?.mode ?? 'gross');
    setStake(String(game?.stake ?? 1));
    setStrokes(
      Object.fromEntries(
        players.map((p) => [
          p.user_id,
          String(game?.players.find((v) => v.userId === p.user_id)?.strokes ?? 0),
        ]),
      ),
    );
    setOrder(game?.mode === 'net' ? game.stroke_order.join(', ') : '');
    setEditing(true);
  };
  const save = () => {
    if (!/^\d+(\.\d{1,2})?$/.test(stake) || Number(stake) <= 0) {
      Alert.alert(
        'Enter a Brass amount',
        'For example, 50 means 50 Brass per skin from each opponent.',
      );
      return;
    }
    const allowances = Object.fromEntries(
      players.map((p) => [p.user_id, mode === 'gross' ? 0 : Number(strokes[p.user_id])]),
    );
    if (mode === 'net' && players.some((p) => !/^\d+$/.test(strokes[p.user_id] ?? ''))) {
      Alert.alert('Enter whole strokes for each player');
      return;
    }
    void run({
      type: 'configure',
      mode,
      stake: Number(stake),
      allowances,
      order:
        mode === 'gross'
          ? Array.from({ length: setup!.holeCount }, (_, i) => i + 1)
          : order
              .split(/[\s,]+/)
              .filter(Boolean)
              .map(Number),
    });
  };
  return (
    <View style={s.section}>
      <Text style={s.title}>Skins</Text>
      {editing && setup ? (
        <>
          <Text style={s.text}>Brass per skin, from each opponent</Text>
          <TextInput
            accessibilityLabel="Brass per skin"
            style={s.input}
            value={stake}
            onChangeText={setStake}
            keyboardType="decimal-pad"
            inputAccessoryViewID="skins-inputs"
          />
          <Text style={s.small}>
            A 50 Brass skin is +100 to the winner in a three-player game: 50 from each opponent.
            Ties carry to the next hole; final ties expire.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {button(mode === 'gross' ? '✓ Gross scores' : 'Gross scores', () => setMode('gross'))}
            {button(mode === 'net' ? '✓ Use strokes' : 'Use strokes', () => setMode('net'))}
          </View>
          {mode === 'net' && (
            <>
              <Text style={s.text}>Strokes received over these {setup.holeCount} holes</Text>
              {players.map((p) => (
                <View key={p.user_id}>
                  <Text style={s.text}>{p.profile?.display_name ?? 'Player'}</Text>
                  <TextInput
                    accessibilityLabel={`${p.profile?.display_name} strokes`}
                    value={strokes[p.user_id] ?? '0'}
                    onChangeText={(v) => setStrokes((old) => ({ ...old, [p.user_id]: v }))}
                    keyboardType="number-pad"
                    inputAccessoryViewID="skins-inputs"
                    style={s.input}
                  />
                </View>
              ))}
              <Text style={s.text}>Played hole numbers, hardest to easiest</Text>
              <Text style={s.small}>
                Use the course’s stroke indexes. Enter every played hole once, separated by commas.
              </Text>
              <TextInput
                accessibilityLabel="Hole difficulty order"
                style={s.input}
                value={order}
                onChangeText={setOrder}
                placeholder="e.g. 5, 3, 1, …"
                placeholderTextColor={palette.sage}
                inputAccessoryViewID="skins-inputs"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </>
          )}
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID="skins-inputs">
              <View
                style={{
                  backgroundColor: palette.graphite,
                  paddingHorizontal: 24,
                  alignItems: 'flex-end',
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  style={{ minHeight: 44, justifyContent: 'center' }}
                  onPress={Keyboard.dismiss}
                >
                  <Text style={s.text}>Done</Text>
                </Pressable>
              </View>
            </InputAccessoryView>
          )}
          {button('Save skins', save)}
          {button('Cancel', () => {
            Keyboard.dismiss();
            setEditing(false);
          })}
        </>
      ) : (
        <>
          {!game || game.state === 'void' ? (
            <>
              <Text style={s.text}>Lowest score wins the hole. Set your own Brass amount.</Text>
              {setup?.isHost && button('Add skins', edit, players.length < 2 || players.length > 4)}
              {setup && players.length < 2 && (
                <Text style={s.small}>Add at least one other player first.</Text>
              )}
            </>
          ) : (
            <>
              <Text style={s.text}>
                {brass(game.stake)} Brass per skin · {game.mode === 'gross' ? 'Gross' : 'Net'}{' '}
                scores
              </Text>
              <Text style={s.small}>
                {game.state === 'settled'
                  ? 'Saved to the ledger. Score edits update Brass automatically.'
                  : 'Brass updates as you score and is saved when you finish the group round.'}
              </Text>
              {game.result && game.state !== 'setup' && (
                <>
                  {game.players.map((p) => (
                    <View key={p.userId} style={s.row}>
                      <Text style={[s.text, { flex: 1 }]}>{p.name}</Text>
                      <Text style={s.amount}>
                        {(game.result!.balances[p.userId] ?? 0) > 0 ? '+' : ''}
                        {brass(game.result!.balances[p.userId] ?? 0)}
                      </Text>
                    </View>
                  ))}
                  {game.result.holes.map((h) => (
                    <View key={h.hole} style={s.row}>
                      <Text style={[s.text, { width: 70 }]}>Hole {h.hole}</Text>
                      <Text style={[s.small, { flex: 1 }]}>
                        {h.state === 'waiting'
                          ? 'Waiting for scores'
                          : h.state === 'carried'
                            ? h.hole === game.hole_count
                              ? 'Tied · no award'
                              : 'Tied · carried'
                            : `${game.players.find((p) => p.userId === h.winnerId)?.name ?? 'Player'} · ${brass((h.skinsAtStake ?? 0) * game.stake)} from each opponent`}
                      </Text>
                    </View>
                  ))}
                </>
              )}
              {setup?.isHost && (
                <>
                  {button('Edit skins', edit)}
                  {button('Remove skins', () =>
                    Alert.alert(
                      'Remove skins?',
                      'Your golf scores stay saved. Skins awards from this game will be removed.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => void run({ type: 'remove' }),
                        },
                      ],
                    ),
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  section: { backgroundColor: palette.ink, padding: 20 },
  title: { fontFamily: fontFamily.display, fontSize: 28, color: palette.bone, marginBottom: 8 },
  text: { fontSize: 16, lineHeight: 24, color: palette.bone },
  small: { fontSize: 14, lineHeight: 22, color: palette.sage, marginVertical: 8 },
  input: {
    minHeight: 48,
    fontSize: 20,
    color: palette.bone,
    borderBottomWidth: 1,
    borderColor: palette.sage,
    paddingVertical: 10,
    marginVertical: 8,
  },
  button: {
    minHeight: 48,
    padding: 12,
    backgroundColor: palette.fairway,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: palette.bone + '33',
  },
  amount: { fontSize: 24, color: palette.brass },
});
