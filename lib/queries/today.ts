import { useQuery } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

export type TodayRoundSummary = {
  id: string;
  played_at: string;
  total_score: number;
  total_par: number;
  hole_count: number | null;
  course: { id: string; name: string | null } | null;
};

/**
 * Lowest-score finished round for the viewer at their home course.
 * Falls back to lowest-score finished round at any course if no home course set.
 */
export function useBestCard(userId: string | undefined, homeCourseId: string | null | undefined) {
  return useQuery({
    queryKey: ['today', 'bestCard', userId, homeCourseId ?? null],
    queryFn: async (): Promise<TodayRoundSummary | null> => {
      if (!userId) return null;
      let q = supabase
        .from('user_round_summaries')
        .select('round_id, played_at, total_score, total_par, hole_count, course_id')
        .eq('user_id', userId)
        .eq('player_status', 'finished')
        .eq('is_draft', false)
        .gt('total_score', 0)
        .order('total_score', { ascending: true })
        .limit(1);
      if (homeCourseId) q = q.eq('course_id', homeCourseId);
      const { data, error } = await q;
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      const courseRes = row.course_id
        ? await supabase.from('courses').select('id, name').eq('id', row.course_id).maybeSingle()
        : { data: null, error: null };
      if (courseRes.error) throw courseRes.error;
      return {
        id: row.round_id as string,
        played_at: row.played_at as string,
        total_score: row.total_score as number,
        total_par: row.total_par as number,
        hole_count: (row.hole_count as number | null) ?? null,
        course: courseRes.data
          ? { id: courseRes.data.id as string, name: courseRes.data.name as string | null }
          : null,
      };
    },
    enabled: !!userId,
  });
}

/** Most recent finished round for the viewer (any course). */
export function useLatestCard(userId: string | undefined) {
  return useQuery({
    queryKey: ['today', 'latestCard', userId],
    queryFn: async (): Promise<TodayRoundSummary | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_round_summaries')
        .select('round_id, played_at, total_score, total_par, hole_count, course_id')
        .eq('user_id', userId)
        .eq('player_status', 'finished')
        .eq('is_draft', false)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      const courseRes = row.course_id
        ? await supabase.from('courses').select('id, name').eq('id', row.course_id).maybeSingle()
        : { data: null, error: null };
      if (courseRes.error) throw courseRes.error;
      return {
        id: row.round_id as string,
        played_at: row.played_at as string,
        total_score: row.total_score as number,
        total_par: row.total_par as number,
        hole_count: (row.hole_count as number | null) ?? null,
        course: courseRes.data
          ? { id: courseRes.data.id as string, name: courseRes.data.name as string | null }
          : null,
      };
    },
    enabled: !!userId,
  });
}

export type RegularsPulse = {
  round: Tables<'rounds'> & { courses: { name: string | null } | null };
  owner: { id: string; username: string | null; display_name: string | null } | null;
};

/**
 * Most recent round visible to the viewer where a mutual is a joined/finished player.
 * Same filter pattern as the feed query (lib/queries/feed.ts step C).
 */
export function useLatestRegularsPulse(viewerId: string | undefined) {
  return useQuery({
    queryKey: ['today', 'regularsPulse', viewerId],
    queryFn: async (): Promise<RegularsPulse | null> => {
      if (!viewerId) return null;
      const followsRes = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', viewerId);
      if (followsRes.error) throw followsRes.error;
      const followingIds = (followsRes.data ?? []).map((r) => r.following_id);
      if (followingIds.length === 0) return null;

      const backRes = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', viewerId)
        .in('follower_id', followingIds);
      if (backRes.error) throw backRes.error;
      const mutualIds = (backRes.data ?? []).map((r) => r.follower_id);
      if (mutualIds.length === 0) return null;

      const rpRes = await supabase
        .from('round_players')
        .select('round_id')
        .in('user_id', mutualIds)
        .in('status', ['joined', 'finished']);
      if (rpRes.error) throw rpRes.error;
      const roundIds = Array.from(new Set((rpRes.data ?? []).map((r) => r.round_id)));
      if (roundIds.length === 0) return null;

      const { data, error } = await supabase
        .from('rounds')
        .select(
          `
          *,
          courses(name),
          profiles!rounds_user_id_fkey(id, username, display_name)
          `,
        )
        .in('id', roundIds)
        .in('visibility', ['mutuals', 'public'])
        .eq('is_draft', false)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      type Row = Tables<'rounds'> & {
        courses: { name: string | null } | null;
        profiles: { id: string; username: string | null; display_name: string | null } | null;
      };
      const r = row as Row;
      return {
        round: { ...r, profiles: undefined } as unknown as RegularsPulse['round'],
        owner: r.profiles,
      };
    },
    enabled: !!viewerId,
  });
}
