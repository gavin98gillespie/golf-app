import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useIsBlocked(viewerId: string | undefined, targetId: string | undefined) {
  return useQuery({
    queryKey: ['is_blocked', viewerId, targetId],
    queryFn: async () => {
      if (!viewerId || !targetId) return false;
      const { count, error } = await supabase
        .from('blocks')
        .select('blocker_id', { count: 'exact', head: true })
        .eq('blocker_id', viewerId)
        .eq('blocked_id', targetId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!viewerId && !!targetId,
  });
}

export function useBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { blockerId: string; blockedId: string }) => {
      const { error } = await supabase
        .from('blocks')
        .insert({ blocker_id: input.blockerId, blocked_id: input.blockedId });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['is_blocked', vars.blockerId, vars.blockedId] });
      qc.invalidateQueries({ queryKey: ['feed', vars.blockerId] });
      qc.invalidateQueries({ queryKey: ['profile_by_username'] });
      qc.invalidateQueries({ queryKey: ['followers_list'] });
      qc.invalidateQueries({ queryKey: ['following_list'] });
    },
  });
}

export function useUnblock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { blockerId: string; blockedId: string }) => {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', input.blockerId)
        .eq('blocked_id', input.blockedId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['is_blocked', vars.blockerId, vars.blockedId] });
      qc.invalidateQueries({ queryKey: ['feed', vars.blockerId] });
    },
  });
}
