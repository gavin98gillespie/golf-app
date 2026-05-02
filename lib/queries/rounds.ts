import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase, type Tables, type Inserts, type Updates } from '@/lib/supabase';

export function useCreateDraftRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Inserts<'rounds'>) => {
      const { data, error } = await supabase
        .from('rounds')
        .insert({ ...input, is_draft: true })
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'rounds'>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}

export function useUserRounds(userId: string | undefined, includeDrafts = false) {
  return useQuery({
    queryKey: ['rounds', 'user', userId, includeDrafts],
    queryFn: async () => {
      if (!userId) return [];
      let q = supabase
        .from('rounds')
        .select('*, courses(name, city, state)')
        .eq('user_id', userId)
        .order('played_at', { ascending: false });
      if (!includeDrafts) q = q.eq('is_draft', false);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useDraftRound(userId: string | undefined) {
  return useQuery({
    queryKey: ['rounds', 'draft', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('user_id', userId)
        .eq('is_draft', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'rounds'> | null;
    },
    enabled: !!userId,
  });
}

export function useUpsertHoleScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Inserts<'round_holes'>) => {
      const { data, error } = await supabase
        .from('round_holes')
        .upsert(input, { onConflict: 'round_id,hole_number' })
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'round_holes'>;
    },
    onSuccess: (saved, vars) => {
      // Merge into cache without triggering refetch (which would race with
      // the user's next tap and revert their input).
      qc.setQueryData<Tables<'round_holes'>[]>(['round_holes', vars.round_id], (prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((h) => h.hole_number === saved.hole_number);
        if (idx === -1) return [...list, saved].sort((a, b) => a.hole_number - b.hole_number);
        const next = list.slice();
        next[idx] = saved;
        return next;
      });
    },
  });
}

export function useRoundHoles(roundId: string | undefined) {
  return useQuery({
    queryKey: ['round_holes', roundId],
    queryFn: async () => {
      if (!roundId) return [];
      const { data, error } = await supabase
        .from('round_holes')
        .select('*')
        .eq('round_id', roundId)
        .order('hole_number');
      if (error) throw error;
      return (data ?? []) as Tables<'round_holes'>[];
    },
    enabled: !!roundId,
  });
}

export function useFinalizeRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; updates: Updates<'rounds'> }) => {
      const { data, error } = await supabase
        .from('rounds')
        .update({ ...input.updates, is_draft: false })
        .eq('id', input.roundId)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'rounds'>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}
