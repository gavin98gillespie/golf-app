import { useQuery } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

export type PendingInvite = Tables<'round_players'> & {
  rounds: Pick<Tables<'rounds'>, 'id' | 'played_at' | 'course_id' | 'user_id'> & {
    courses: { name: string } | null;
  };
  inviter: { display_name: string | null; username: string | null } | null;
};

export function usePendingInvites(userId: string | undefined) {
  return useQuery({
    queryKey: ['pendingInvites', userId],
    queryFn: async (): Promise<PendingInvite[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('round_players')
        .select(
          `*,
           rounds!inner(id, played_at, course_id, user_id, courses(name)),
           inviter:profiles!round_players_invited_by_fkey(display_name, username)`,
        )
        .eq('user_id', userId)
        .eq('status', 'invited');
      if (error) throw error;
      return (data ?? []) as unknown as PendingInvite[];
    },
    enabled: !!userId,
    refetchInterval: 30_000,
  });
}

export function usePendingInvitesCount(userId: string | undefined) {
  const q = usePendingInvites(userId);
  return q.data?.length ?? 0;
}
