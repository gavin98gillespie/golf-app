import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

// -- Reads ------------------------------------------------------------------

export function useIsFollowing(viewerId: string | undefined, targetId: string | undefined) {
  return useQuery({
    queryKey: ['is_following', viewerId, targetId],
    queryFn: async () => {
      if (!viewerId || !targetId || viewerId === targetId) return false;
      const { count, error } = await supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('follower_id', viewerId)
        .eq('following_id', targetId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!viewerId && !!targetId && viewerId !== targetId,
  });
}

export function useIsMutual(viewerId: string | undefined, targetId: string | undefined) {
  return useQuery({
    queryKey: ['is_mutual', viewerId, targetId],
    queryFn: async () => {
      if (!viewerId || !targetId || viewerId === targetId) return false;
      const { data, error } = await supabase.rpc('are_mutuals', {
        a: viewerId,
        b: targetId,
      });
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!viewerId && !!targetId && viewerId !== targetId,
  });
}

export function useFollowerCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['follower_count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', userId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

export function useFollowingCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['following_count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', userId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

// -- Mutations --------------------------------------------------------------

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { followerId: string; followingId: string }) => {
      const { error } = await supabase.from('follows').insert({
        follower_id: input.followerId,
        following_id: input.followingId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.setQueryData(['is_following', vars.followerId, vars.followingId], true);
      qc.invalidateQueries({ queryKey: ['is_mutual', vars.followerId, vars.followingId] });
      qc.invalidateQueries({ queryKey: ['is_mutual', vars.followingId, vars.followerId] });
      qc.invalidateQueries({ queryKey: ['follower_count', vars.followingId] });
      qc.invalidateQueries({ queryKey: ['following_count', vars.followerId] });
      qc.invalidateQueries({ queryKey: ['feed', vars.followerId] });
    },
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { followerId: string; followingId: string }) => {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', input.followerId)
        .eq('following_id', input.followingId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.setQueryData(['is_following', vars.followerId, vars.followingId], false);
      qc.invalidateQueries({ queryKey: ['is_mutual', vars.followerId, vars.followingId] });
      qc.invalidateQueries({ queryKey: ['is_mutual', vars.followingId, vars.followerId] });
      qc.invalidateQueries({ queryKey: ['follower_count', vars.followingId] });
      qc.invalidateQueries({ queryKey: ['following_count', vars.followerId] });
      qc.invalidateQueries({ queryKey: ['feed', vars.followerId] });
    },
  });
}

export type RelationUser = Pick<
  Tables<'profiles'>,
  'id' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'home_course_id'
>;

export function useFollowersList(userId: string | undefined) {
  return useQuery({
    queryKey: ['followers_list', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('follows')
        .select(
          'profiles!follows_follower_id_fkey ( id, username, display_name, avatar_url, bio, home_course_id )',
        )
        .eq('following_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row) => (row as { profiles: RelationUser | null }).profiles)
        .filter((p): p is RelationUser => p !== null);
    },
    enabled: !!userId,
  });
}

export function useFollowingList(userId: string | undefined) {
  return useQuery({
    queryKey: ['following_list', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('follows')
        .select(
          'profiles!follows_following_id_fkey ( id, username, display_name, avatar_url, bio, home_course_id )',
        )
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row) => (row as { profiles: RelationUser | null }).profiles)
        .filter((p): p is RelationUser => p !== null);
    },
    enabled: !!userId,
  });
}
