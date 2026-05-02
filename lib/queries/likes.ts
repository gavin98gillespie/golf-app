import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useLikeCount(roundId: string | undefined) {
  return useQuery({
    queryKey: ['like_count', roundId],
    queryFn: async () => {
      if (!roundId) return 0;
      const { count, error } = await supabase
        .from('likes')
        .select('user_id', { count: 'exact', head: true })
        .eq('round_id', roundId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!roundId,
  });
}

export function useHasLiked(viewerId: string | undefined, roundId: string | undefined) {
  return useQuery({
    queryKey: ['has_liked', viewerId, roundId],
    queryFn: async () => {
      if (!viewerId || !roundId) return false;
      const { count, error } = await supabase
        .from('likes')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', viewerId)
        .eq('round_id', roundId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!viewerId && !!roundId,
  });
}

export function useLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; roundId: string }) => {
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: input.userId, round_id: input.roundId });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.setQueryData(['has_liked', vars.userId, vars.roundId], true);
      qc.invalidateQueries({ queryKey: ['like_count', vars.roundId] });
    },
  });
}

export function useUnlike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; roundId: string }) => {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', input.userId)
        .eq('round_id', input.roundId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.setQueryData(['has_liked', vars.userId, vars.roundId], false);
      qc.invalidateQueries({ queryKey: ['like_count', vars.roundId] });
    },
  });
}
