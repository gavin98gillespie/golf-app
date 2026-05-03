import { useQuery } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

export type FeedRound = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count'> | null;
  profiles: Pick<Tables<'profiles'>, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
};

export function useFeed(viewerId: string | undefined, limit = 30) {
  return useQuery({
    queryKey: ['feed', viewerId, limit],
    queryFn: async () => {
      if (!viewerId) return [];
      // Step A: who do I follow?
      const { data: follows, error: followsErr } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', viewerId);
      if (followsErr) throw followsErr;
      const followingIds = (follows ?? []).map((r) => r.following_id);
      if (followingIds.length === 0) return [];

      // Step B: of those, who follows me back? RLS will filter to mutuals,
      // but we narrow client-side first to keep the rounds query small.
      const { data: backFollows, error: backErr } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', viewerId)
        .in('follower_id', followingIds);
      if (backErr) throw backErr;
      const mutualIds = (backFollows ?? []).map((r) => r.follower_id);
      if (mutualIds.length === 0) return [];

      // Step C: round IDs where any mutual is a joined/finished player.
      // Solo rounds also have a round_players row (host as sole player), so
      // this query covers solo + group rounds uniformly. Group rounds where
      // the viewer is host but a mutual is a participant will also surface,
      // which solves the case of multi-player rounds going missing from the
      // feed when only the non-host happens to be a mutual.
      const { data: rpRows, error: rpErr } = await supabase
        .from('round_players')
        .select('round_id')
        .in('user_id', mutualIds)
        .in('status', ['joined', 'finished']);
      if (rpErr) throw rpErr;
      const roundIds = Array.from(new Set((rpRows ?? []).map((r) => r.round_id)));
      if (roundIds.length === 0) return [];

      const { data, error } = await supabase
        .from('rounds')
        .select(
          `
          *,
          courses ( name, hole_count ),
          profiles!rounds_user_id_fkey ( id, username, display_name, avatar_url )
          `,
        )
        .in('id', roundIds)
        .in('visibility', ['mutuals', 'public'])
        .eq('is_draft', false)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as FeedRound[];
    },
    enabled: !!viewerId,
  });
}
