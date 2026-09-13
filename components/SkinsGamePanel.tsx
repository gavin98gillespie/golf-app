import { useState } from 'react';
import {
  Alert,
  Keyboard,
  InputAccessoryView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/hooks/useSession';
import { useSkinsAction, useSkinsGame, type GameAction } from '@/lib/queries/skins';
import { palette, fontFamily } from '@/theme/linksman';
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
  setup?: Setup;
  compact?: boolean;
}) {
  const query = useSkinsGame(roundId);
  const action = useSkinsAction(roundId);
  const { session } = useSession();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<'gross' | 'net'>('gross');
  const [strokes, setStrokes] = useState<Record<string, string>>({});
  const [order, setOrder] = useState('');
  const game = query.data;
  const mine = game?.players.find((p) => p.userId === session?.user.id);
  const run = async (input: GameAction) => {
    try {
      Keyboard.dismiss();
      await action.mutateAsync(input);
      setEditing(false);
    } catch (e) {
      Alert.alert(
        'Could not update skins',
        e instanceof Error
          ? e.message
          : ((e as { message?: string }).message ?? 'Please try again.'),
      );
    }
  };
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || action.isPending}
      onPress={onPress}
      style={[styles.button, { opacity: disabled || action.isPending ? 0.45 : 1 }]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
  if (query.isPending)
    return setup ? (
      <View style={styles.section}>
        <Text style={styles.text}>Loading game options…</Text>
      </View>
    ) : null;
  if (query.isError)
    return (
      <View style={styles.section}>
        <Text style={styles.text}>Could not load skins.</Text>
        {button('Retry', () => void query.refetch())}
      </View>
    );
  if (!game && !setup) return null;
  if (compact && game)
    return (
      <View style={styles.section}>
        <Text style={styles.title}>
          Skins ·{' '}
          {game.state === 'settled'
            ? 'Confirmed'
            : game.state === 'void'
              ? 'Voided'
              : 'Provisional'}
        </Text>
        <Text style={styles.text}>
          {game.state === 'void'
            ? 'This game was voided. No Brass counts.'
            : game.state === 'settled'
              ? 'Everyone confirmed. Your result is saved in the ledger.'
              : `${game.result?.resolvedHoles ?? 0} of ${game.hole_count} holes resolved. Brass posts after everyone confirms.`}
        </Text>
        {button('View skins', () =>
          router.push({ pathname: '/round/group/[id]/game', params: { id: roundId } }),
        )}
      </View>
    );
  const joined = setup?.players.filter((p) => p.status === 'joined') ?? [];
  const save = () => {
    const allowances = Object.fromEntries(
      joined.map((p) => [p.user_id, mode === 'gross' ? 0 : Number(strokes[p.user_id] ?? '0')]),
    );
    if (mode === 'net' && joined.some((p) => !/^\d+$/.test(strokes[p.user_id] ?? ''))) {
      Alert.alert('Enter agreed strokes', 'Enter a whole number for each player, including zero.');
      return;
    }
    const parsed =
      mode === 'gross'
        ? Array.from({ length: setup!.holeCount }, (_, i) => i + 1)
        : order
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(Number);
    void run({ type: 'configure', mode, allowances, order: parsed });
  };
  const edit = () => {
    setMode(game?.mode ?? 'gross');
    setStrokes(Object.fromEntries(game?.players.map((p) => [p.userId, String(p.strokes)]) ?? []));
    setOrder(game?.mode === 'net' ? game.stroke_order.join(', ') : '');
    setEditing(true);
  };
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{game ? 'Skins' : 'Choose your game'}</Text>
      {!game && !editing && (
        <>
          <Text style={styles.text}>
            Score only, or play skins for Brass points. Everyone agrees before teeing off.
          </Text>
          {setup?.isHost && (joined.length < 2 || joined.length > 4) && (
            <Text style={styles.small}>Skins needs 2–4 joined players.</Text>
          )}
          {setup?.isHost ? (
            button('Add skins', edit, joined.length < 2 || joined.length > 4)
          ) : (
            <Text style={styles.text}>The host can add skins once 2–4 players have joined.</Text>
          )}
        </>
      )}
      {editing && setup && (
        <>
          <Text style={styles.text}>
            Lowest score wins the hole. Ties carry forward. Each opponent gives the winner 1 Brass
            per skin. Final ties expire. Brass has no cash value.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['gross', 'net'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ checked: mode === m }}
                style={[
                  styles.button,
                  { flex: 1, backgroundColor: mode === m ? palette.fairway : palette.graphite },
                ]}
                onPress={() => setMode(m)}
              >
                <Text style={styles.buttonText}>
                  {m === 'gross' ? 'Gross scores' : 'Net scores'}
                </Text>
              </Pressable>
            ))}
          </View>
          {mode === 'net' && (
            <>
              <Text style={styles.text}>
                Agree strokes received over these {setup.holeCount} holes. These are game
                allowances, not handicap indexes.
              </Text>
              {joined.map((p) => (
                <View key={p.user_id}>
                  <Text style={styles.text}>
                    {p.profile?.display_name ?? 'Player'} · strokes received
                  </Text>
                  <TextInput
                    inputAccessoryViewID="skins-game-inputs"
                    accessibilityLabel={`${p.profile?.display_name ?? 'Player'} strokes received`}
                    style={styles.input}
                    value={strokes[p.user_id] ?? ''}
                    onChangeText={(v) => setStrokes((s) => ({ ...s, [p.user_id]: v }))}
                    keyboardType="numbers-and-punctuation"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    placeholder="0"
                    placeholderTextColor={palette.sage}
                  />
                </View>
              ))}
              <Text style={styles.text}>
                Hole numbers, hardest to easiest. Use your scorecard’s stroke indexes for only the
                holes being played. Enter every hole once, separated by commas.
              </Text>
              <TextInput
                inputAccessoryViewID="skins-game-inputs"
                accessibilityLabel="Hardest to easiest hole numbers"
                style={styles.input}
                value={order}
                onChangeText={setOrder}
                placeholder="e.g. 5, 3, 1, …"
                placeholderTextColor={palette.sage}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </>
          )}
          {Platform.OS === 'ios' && mode === 'net' && (
            <InputAccessoryView nativeID="skins-game-inputs">
              <View
                style={{
                  backgroundColor: palette.graphite,
                  alignItems: 'flex-end',
                  paddingHorizontal: 18,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={Keyboard.dismiss}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={styles.buttonText}>Done</Text>
                </Pressable>
              </View>
            </InputAccessoryView>
          )}
          {button('Save rules for everyone to review', save)}
          {button('Cancel', () => {
            Keyboard.dismiss();
            setEditing(false);
          })}
        </>
      )}
      {game && !editing && (
        <>
          <Text style={styles.text}>
            {game.mode === 'gross' ? 'Gross' : 'Agreed net'} · {game.hole_count} holes · 1 Brass per
            skin, from each opponent.
          </Text>
          <Text style={styles.text}>
            Ties carry forward. Final ties expire. Brass is points only.
          </Text>
          {game.mode === 'net' && (
            <Text style={styles.text}>Stroke order: {game.stroke_order.join(', ')}</Text>
          )}
          <Text style={styles.label}>
            {game.state === 'setup'
              ? 'AGREE BEFORE STARTING'
              : game.state === 'settled'
                ? 'CONFIRMED · SAVED TO LEDGER'
                : game.state === 'void'
                  ? 'VOID · NO BRASS COUNTS'
                  : 'PROVISIONAL · NOT IN LEDGER YET'}
          </Text>
          {game.players.map((p) => (
            <View style={styles.row} key={p.userId}>
              <View style={{ flex: 1 }}>
                <Text style={styles.text}>
                  {p.name}
                  {p.userId === session?.user.id ? ' (you)' : ''}
                </Text>
                <Text style={styles.small}>
                  {game.mode === 'net' ? `${p.strokes} strokes · ` : ''}
                  {game.state === 'setup'
                    ? p.accepted
                      ? 'Agreed'
                      : 'Reviewing rules'
                    : p.confirmed
                      ? 'Result confirmed'
                      : p.finished
                        ? 'Scorecard finished'
                        : 'Still scoring'}
                </Text>
              </View>
              {game.result && game.state !== 'void' && game.state !== 'setup' && (
                <Text style={styles.balance}>
                  {(game.result.balances[p.userId] ?? 0) > 0 ? '+' : ''}
                  {game.result.balances[p.userId] ?? 0}
                </Text>
              )}
            </View>
          ))}
          {game.state === 'setup' && (
            <>
              {button(
                mine?.accepted ? 'You agreed' : 'Agree to these rules',
                () => void run({ type: 'accept', revision: game.revision }),
                !!mine?.accepted,
              )}
              {setup?.isHost && (
                <>
                  {button('Change rules', edit)}
                  {button('Use score only', () => void run({ type: 'remove' }))}
                </>
              )}
            </>
          )}
          {game.state === 'active' && (
            <>
              <Text style={styles.text}>
                {game.result?.allScoresPresent && game.players.every((p) => p.finished)
                  ? 'Review the hole results below. Everyone must confirm this result before Brass is recorded.'
                  : `Waiting for all scorecards: ${game.result?.resolvedHoles ?? 0} of ${game.hole_count} holes resolved.`}
              </Text>
            </>
          )}
          {game.result && game.state !== 'void' && game.state !== 'setup' && (
            <>
              {game.result.holes.map((h) => (
                <View style={styles.row} key={h.hole}>
                  <Text style={[styles.text, { width: 65 }]}>Hole {h.hole}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.text}>
                      {h.state === 'waiting'
                        ? 'Waiting for scores'
                        : h.state === 'carried'
                          ? h.hole === game.hole_count && game.result?.allScoresPresent
                            ? 'Tied · no award'
                            : 'Tied · carries forward'
                          : `${game.players.find((p) => p.userId === h.winnerId)?.name ?? 'Player'} · ${h.skinsAtStake} ${h.skinsAtStake === 1 ? 'skin' : 'skins'}`}
                    </Text>
                    <Text style={styles.small}>
                      {h.scores
                        .map(
                          (s) =>
                            `${game.players.find((p) => p.userId === s.playerId)?.name ?? 'Player'} ${s.gross}${game.mode === 'net' ? ` (${s.net} net)` : ''}`,
                        )
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
              ))}
              {game.result.unawardedSkins > 0 && (
                <Text style={styles.text}>
                  {game.result.unawardedSkins} final tied skins expired without an award.
                </Text>
              )}
            </>
          )}
          {game.state === 'active' && (
            <>
              {' '}
              {button(
                mine?.confirmed ? 'Waiting for the others' : 'Confirm this result',
                () => void run({ type: 'confirm', revision: game.revision }),
                !!mine?.confirmed ||
                  !game.result?.allScoresPresent ||
                  !game.players.every((p) => p.finished),
              )}
            </>
          )}
          {button('Open rivalry ledger', () => router.push('/ledger'))}
          {game.state === 'active' &&
            button('Void skins', () =>
              Alert.alert(
                'Void this game?',
                'No Brass will count. Everyone’s golf scores stay saved. This cannot be undone.',
                [
                  { text: 'Keep playing', style: 'cancel' },
                  {
                    text: 'Void skins',
                    style: 'destructive',
                    onPress: () => void run({ type: 'remove' }),
                  },
                ],
              ),
            )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { backgroundColor: palette.ink, padding: 18, marginVertical: 20 },
  title: { fontFamily: fontFamily.display, fontSize: 28, color: palette.bone, marginBottom: 10 },
  text: { fontSize: 16, lineHeight: 24, color: palette.bone, marginVertical: 4 },
  small: { fontSize: 14, lineHeight: 21, color: palette.sage },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.sage,
    marginTop: 18,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.bone + '33',
  },
  balance: { fontSize: 24, color: palette.brass },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: palette.fairway,
    marginTop: 12,
  },
  buttonText: { fontSize: 16, color: palette.bone, textAlign: 'center' },
  input: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: palette.sage,
    fontSize: 18,
    color: palette.bone,
    paddingVertical: 10,
  },
});
