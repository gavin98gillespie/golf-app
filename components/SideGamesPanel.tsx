import { BrassAmount, BrassCoin } from '@/components/BrassAmount';
import { useSideGames } from '@/lib/queries/sideGames';
import { RulesButton } from '@/components/GameRulesSheet';
import { GAME_RULES, type GameKind } from '@/lib/gameRules';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { useGroupRound } from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';
export function SideGamesPanel({
  roundId,
  onFormChange,
  selectedGame,
  hole = 1,
  onSaved,
  onCancel,
}: {
  roundId: string;
  hole?: number;
  onSaved?: () => void;
  onCancel?: () => void;
  selectedGame?: Exclude<GameKind, 'skins'> | undefined;
  onFormChange?: () => void;
}) {
  const { session } = useSession();
  const group = useGroupRound(roundId);
  const qc = useQueryClient();
  const players = useMemo(
    () => group.data?.players.filter((p) => p.status === 'joined' || p.status === 'finished') ?? [],
    [group.data?.players],
  );
  const canEdit =
    group.data?.round.user_id === session?.user.id ||
    players.some((p) => p.user_id === session?.user.id);
  const q = useSideGames(roundId);
  const [form, setForm] = useState<{
    id: string | null;
    from: string;
    to: string;
    amount: string;
    hole: string;
    label: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const name = (id: string | null) =>
    players.find((p) => p.user_id === id)?.profile?.display_name ?? 'Former player';
  const refresh = async () => {
    await Promise.all([q.refetch(), qc.invalidateQueries({ queryKey: ['brassLedger'] })]);
  };
  const edit = (e?: Tables<'round_side_games'>) => {
    onFormChange?.();
    setForm(
      e
        ? {
            id: e.id,
            from: e.from_player,
            to: e.to_player,
            amount: String(e.amount),
            hole: String(e.hole),
            label: e.label,
          }
        : {
            id: null,
            from: '',
            to: '',
            amount: '50',
            hole: String(hole),
            label: selectedGame && selectedGame !== 'custom' ? GAME_RULES[selectedGame].title : '',
          },
    );
  };
  const opened = useRef(false);
  useEffect(() => {
    if (!selectedGame || opened.current || !canEdit || players.length < 2) return;
    opened.current = true;
    setForm({
      id: null,
      from: '',
      to: '',
      amount: '50',
      hole: String(hole),
      label: selectedGame === 'custom' ? '' : GAME_RULES[selectedGame].title,
    });
  }, [selectedGame, canEdit, players, session?.user.id, hole]);
  const save = async () => {
    if (!form) return;
    if (form.from === form.to || !form.from || !form.to) {
      Alert.alert('Choose two different players');
      return;
    }
    if (
      !/^\d+(\.\d{1,2})?$/.test(form.amount) ||
      Number(form.amount) <= 0 ||
      Number(form.amount) > 1000000 ||
      !form.label.trim() ||
      Number(form.hole) < 1 ||
      Number(form.hole) > (group.data?.round.hole_count ?? 18) ||
      !/^\d+$/.test(form.hole)
    ) {
      Alert.alert(
        'Check the amount and hole',
        'Use a positive Brass amount and a whole hole number.',
      );
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc('save_side_game', {
        p_round: roundId,
        ...(form.id ? { p_id: form.id } : {}),
        p_from: form.from,
        p_to: form.to,
        p_amount: Number(form.amount),
        p_hole: Number(form.hole),
        p_label: form.label,
      });
      if (error) throw error;
      Keyboard.dismiss();
      setForm(null);
      onFormChange?.();
      await refresh();
      onSaved?.();
    } catch (e) {
      Alert.alert('Could not save Brass', (e as { message?: string }).message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('delete_side_game', { p_id: id });
      if (error) throw error;
      await refresh();
    } catch (e) {
      Alert.alert('Could not delete entry', (e as { message?: string }).message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ paddingVertical: 20 }}>
      <Text style={s.title}>
        {form?.label || (selectedGame ? GAME_RULES[selectedGame].title : 'Side games')}
      </Text>
      <Text style={s.small}>
        {selectedGame === 'drive'
          ? 'Longest tee shot in the fairway wins.'
          : selectedGame === 'closest'
            ? 'Nearest eligible tee shot to the pin wins.'
            : 'Your challenge. Your agreed result.'}
      </Text>
      <RulesButton
        game={
          form?.label === GAME_RULES.closest.title
            ? 'closest'
            : form?.label === GAME_RULES.drive.title
              ? 'drive'
              : form
                ? 'custom'
                : (selectedGame ?? 'custom')
        }
      />
      {form ? (
        <>
          {(!selectedGame || selectedGame === 'custom') && (
            <>
              <Text style={s.label}>Challenge name</Text>
              <TextInput
                accessibilityLabel="Side game name"
                value={form.label}
                onChangeText={(label) => setForm({ ...form, label })}
                style={s.input}
                maxLength={60}
                returnKeyType="done"
                inputAccessoryViewID="side-game-inputs"
                onSubmitEditing={Keyboard.dismiss}
              />
            </>
          )}
          <Text style={s.label}>Who pays?</Text>
          <View style={s.options}>
            {players.map((p) => (
              <Pressable
                accessibilityRole="button"
                key={p.user_id}
                accessibilityState={{ selected: form.from === p.user_id }}
                onPress={() =>
                  setForm({ ...form, from: p.user_id, to: form.to === p.user_id ? '' : form.to })
                }
                style={[s.option, form.from === p.user_id && s.selected]}
              >
                <Text style={s.text}>
                  {form.from === p.user_id ? '✓ ' : ''}
                  {name(p.user_id)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>Winner</Text>
          <View style={s.options}>
            {players.map((p) => (
              <Pressable
                accessibilityRole="button"
                key={p.user_id}
                accessibilityState={{ selected: form.to === p.user_id }}
                onPress={() =>
                  setForm({
                    ...form,
                    to: p.user_id,
                    from: form.from === p.user_id ? '' : form.from,
                  })
                }
                style={[s.option, form.to === p.user_id && s.selected]}
              >
                <Text style={s.text}>
                  {form.to === p.user_id ? '✓ ' : ''}
                  {name(p.user_id)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 12 }}>
            <View style={{ flex: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BrassCoin size={24} />
                <Text style={s.label}>Brass</Text>
              </View>
              <TextInput
                accessibilityLabel="Brass amount"
                value={form.amount}
                onChangeText={(amount) => setForm({ ...form, amount })}
                keyboardType="decimal-pad"
                inputAccessoryViewID="side-game-inputs"
                style={s.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Hole</Text>
              <TextInput
                accessibilityLabel="Side game hole"
                value={form.hole}
                onChangeText={(hole) => setForm({ ...form, hole })}
                keyboardType="number-pad"
                inputAccessoryViewID="side-game-inputs"
                style={s.input}
              />
            </View>
          </View>
          <Text style={s.small}>One entry transfers this amount from the payer to the winner.</Text>
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID="side-game-inputs">
              <View
                style={{
                  backgroundColor: palette.graphite,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: palette.bone + '22',
                  alignItems: 'flex-end',
                  paddingHorizontal: 24,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={Keyboard.dismiss}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={s.text}>Done</Text>
                </Pressable>
              </View>
            </InputAccessoryView>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void save()}
            style={s.button}
          >
            <Text style={[s.text, { color: palette.ink }]}>
              {busy ? 'Saving…' : 'Record winner'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              Keyboard.dismiss();
              setForm(null);
              onCancel?.();
            }}
            style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={s.text}>Cancel</Text>
          </Pressable>
        </>
      ) : (
        canEdit && (
          <Pressable
            accessibilityRole="button"
            disabled={players.length < 2 || busy}
            onPress={() => edit()}
            style={s.button}
          >
            <Text style={s.text}>+ Add side game</Text>
          </Pressable>
        )
      )}
      {q.isError && (
        <Pressable onPress={() => void q.refetch()} style={s.option}>
          <Text style={s.text}>Could not load side games. Retry</Text>
        </Pressable>
      )}
      {(q.data ?? [])
        .filter(
          (e) =>
            !selectedGame ||
            (selectedGame === 'custom'
              ? ![GAME_RULES.closest.title, GAME_RULES.drive.title].includes(
                  e.label as typeof GAME_RULES.closest.title,
                )
              : e.label === GAME_RULES[selectedGame].title),
        )
        .map((e) => (
          <View
            key={e.id}
            style={{
              borderBottomWidth: 0.5,
              borderColor: palette.bone + '33',
              paddingVertical: 18,
            }}
          >
            <Text style={s.label}>
              {e.label} · Hole {e.hole}
            </Text>
            <Text style={s.text}>
              {name(e.to_player)} won · from {name(e.from_player)}
            </Text>
            <BrassAmount amount={e.amount} />
            <Text style={s.small}>Edited by {name(e.edited_by)}</Text>
            {canEdit && (
              <View style={s.options}>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => edit(e)}
                  style={s.option}
                >
                  <Text style={s.text}>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert('Delete this Brass entry?', 'You can add it again if needed.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => void remove(e.id) },
                    ])
                  }
                  style={s.option}
                >
                  <Text style={s.text}>Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
    </View>
  );
}
const s = StyleSheet.create({
  title: { fontFamily: fontFamily.display, fontSize: 28, color: palette.bone, marginBottom: 8 },
  text: { fontSize: 16, lineHeight: 24, color: palette.bone },
  label: { fontSize: 18, lineHeight: 25, color: palette.bone, marginVertical: 12 },
  small: { fontSize: 14, color: palette.sage, marginTop: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  option: {
    minHeight: 48,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: palette.graphite,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.bone + '22',
  },
  selected: { backgroundColor: palette.fairway, borderColor: palette.brass },
  button: {
    minHeight: 48,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brass,
    borderRadius: 28,
    marginVertical: 12,
  },
  input: {
    minHeight: 48,
    fontSize: 28,
    color: palette.bone,
    borderBottomWidth: 1,
    borderColor: palette.sage,
    paddingVertical: 8,
  },
});
