import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { useSession } from '@/lib/hooks/useSession';
import { supabase } from '@/lib/supabase';
import type { SkinsResult } from '@/lib/games/skins';
function useScreenFocused() {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused && active;
}
export type SkinsGame = {
  round_id: string;
  host_id: string;
  course_name: string;
  hole_count: 9 | 18;
  mode: 'gross' | 'net';
  stroke_order: number[];
  state: 'setup' | 'active' | 'settled' | 'void';
  revision: number;
  result: SkinsResult | null;
  players: {
    userId: string;
    name: string;
    strokes: number;
    accepted: boolean;
    confirmed: boolean;
    finished: boolean;
  }[];
};
export type LedgerEntry = {
  id: string;
  round_id: string;
  revision: number;
  opponent: string;
  name: string;
  change: number;
  hole: number;
  kind: 'award' | 'reversal';
  course: string;
  created_at: string;
};
export function useSkinsGame(roundId: string) {
  const { session } = useSession();
  const focused = useScreenFocused();
  return useQuery({
    queryKey: ['skins', roundId, session?.user.id],
    enabled: !!roundId && !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_skins_game', { p_round: roundId });
      if (error) throw error;
      return data as unknown as SkinsGame | null;
    },
    // Poll only the visible screen; finished games can change after score corrections.
    refetchInterval: focused ? 5000 : false,
  });
}
export type GameAction =
  | {
      type: 'configure';
      mode: 'gross' | 'net';
      allowances: Record<string, number>;
      order: number[];
    }
  | { type: 'accept' | 'confirm'; revision: number }
  | { type: 'remove' };
export function useSkinsAction(roundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: GameAction) => {
      const response =
        action.type === 'configure'
          ? await supabase.rpc('configure_skins', {
              p_round: roundId,
              p_mode: action.mode,
              p_allowances: action.allowances,
              p_order: action.order,
            })
          : action.type === 'remove'
            ? await supabase.rpc('remove_or_void_skins', { p_round: roundId })
            : await supabase.rpc(action.type === 'accept' ? 'accept_skins' : 'confirm_skins', {
                p_round: roundId,
                p_revision: action.revision,
              });
      if (response.error) throw response.error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['skins', roundId] }),
        qc.invalidateQueries({ queryKey: ['brassLedger'] }),
        qc.invalidateQueries({ queryKey: ['groupRound', roundId] }),
      ]);
    },
  });
}
export function useBrassLedger() {
  const { session } = useSession();
  const focused = useScreenFocused();
  return useQuery({
    queryKey: ['brassLedger', session?.user.id],
    enabled: !!session,
    refetchInterval: focused ? 10000 : false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_brass_ledger');
      if (error) throw error;
      return data as unknown as LedgerEntry[];
    },
  });
}
