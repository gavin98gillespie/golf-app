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

      // Step B: round IDs where any followed user is a joined/finished player.
      // RLS narrows further to rounds the viewer is permitted to see.
      // Solo rounds also have a round_players row (host as sole player), so
      // this query covers solo + group rounds uniformly.
      const { data: rpRows, error: rpErr } = await supabase
        .from('round_players')
        .select('round_id')
        .in('user_id', followingIds)
        .in('status', ['joined', 'finished']);
      if (rpErr) throw rpErr;
      const roundIds = Array.from(new Set((rpRows ?? []).map((r) => r.round_id)));
      if (roundIds.length === 0) return [];

      // Fetch rounds visible to viewer from people they follow. RLS enforces
      // final visibility; the visibility filter here is a client-side hint only.
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
