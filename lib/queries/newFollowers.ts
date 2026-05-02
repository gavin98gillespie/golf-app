import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Count of users who follow `userId` but whom `userId` doesn't follow back.
 * Drives the "follow-back hint" dot on the Profile tab.
 */
export function useNewFollowersCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['new_followers_count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const [followersRes, followingRes] = await Promise.all([
        supabase.from('follows').select('follower_id').eq('following_id', userId),
        supabase.from('follows').select('following_id').eq('follower_id', userId),
      ]);
      if (followersRes.error) throw followersRes.error;
      if (followingRes.error) throw followingRes.error;
      const following = new Set((followingRes.data ?? []).map((r) => r.following_id));
      const newOnes = (followersRes.data ?? []).filter((r) => !following.has(r.follower_id));
      return newOnes.length;
    },
    enabled: !!userId,
    refetchInterval: 30_000,
  });
}
