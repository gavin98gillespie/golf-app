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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGroupRound } from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';
import { brass } from '@/components/SkinsGamePanel';
import { palette, fontFamily } from '@/theme/linksman';
export function SideGamesPanel({
  roundId,
  onFormChange,
}: {
  roundId: string;
  onFormChange?: () => void;
}) {
  const { session } = useSession();
  const group = useGroupRound(roundId);
  const qc = useQueryClient();
  const players =
    group.data?.players.filter((p) => p.status === 'joined' || p.status === 'finished') ?? [];
  const canEdit =
    group.data?.round.user_id === session?.user.id ||
    players.some((p) => p.user_id === session?.user.id);
  const q = useQuery({
    queryKey: ['sideGames', roundId, session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('round_side_games')
        .select('*')
        .eq('round_id', roundId)
        .order('edited_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
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
            from: session?.user.id ?? players[0]?.user_id ?? '',
            to: players.find((p) => p.user_id !== session?.user.id)?.user_id ?? '',
            amount: '50',
            hole: '1',
            label: 'Closest to pin',
          },
    );
  };
  const save = async () => {
    if (!form) return;
    if (form.from === form.to || !form.from || !form.to) {
      Alert.alert('Choose two different players');
      return;
    }
    if (
      !/^\d+(\.\d{1,2})?$/.test(form.amount) ||
      Number(form.amount) <= 0 ||
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
      <Text style={s.title}>Side games & Brass</Text>
      <Text style={s.text}>
        Closest to pin, longest drive, or your own side game. Enter the amount you played for: 50
        means 50 Brass.
      </Text>
      {form ? (
        <>
          <Text style={s.label}>Game</Text>
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
          <Text style={s.label}>From</Text>
          <View style={s.options}>
            {players.map((p) => (
              <Pressable
                accessibilityRole="button"
                key={p.user_id}
                onPress={() => setForm({ ...form, from: p.user_id })}
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
                onPress={() => setForm({ ...form, to: p.user_id })}
                style={[s.option, form.to === p.user_id && s.selected]}
              >
                <Text style={s.text}>
                  {form.to === p.user_id ? '✓ ' : ''}
                  {name(p.user_id)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>Brass amount</Text>
          <TextInput
            accessibilityLabel="Brass amount"
            value={form.amount}
            onChangeText={(amount) => setForm({ ...form, amount })}
            keyboardType="decimal-pad"
            inputAccessoryViewID="side-game-inputs"
            style={s.input}
          />
          <Text style={s.label}>Hole</Text>
          <TextInput
            accessibilityLabel="Side game hole"
            value={form.hole}
            onChangeText={(hole) => setForm({ ...form, hole })}
            keyboardType="number-pad"
            inputAccessoryViewID="side-game-inputs"
            style={s.input}
          />
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID="side-game-inputs">
              <View
                style={{
                  backgroundColor: palette.graphite,
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
            <Text style={s.text}>{busy ? 'Saving…' : 'Save Brass'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              Keyboard.dismiss();
              setForm(null);
            }}
            style={s.option}
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
      {(q.data ?? []).map((e) => (
        <View
          key={e.id}
          style={{ borderBottomWidth: 0.5, borderColor: palette.bone + '33', paddingVertical: 18 }}
        >
          <Text style={s.label}>
            {e.label} · Hole {e.hole}
          </Text>
          <Text style={s.text}>
            {name(e.from_player)} → {name(e.to_player)} · {brass(e.amount)} Brass
          </Text>
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
  },
  selected: { backgroundColor: palette.fairway },
  button: {
    minHeight: 48,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.fairway,
    marginVertical: 12,
  },
  input: {
    minHeight: 48,
    fontSize: 20,
    color: palette.bone,
    borderBottomWidth: 1,
    borderColor: palette.sage,
    paddingVertical: 8,
  },
});
