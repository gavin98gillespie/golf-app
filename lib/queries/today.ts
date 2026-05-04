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
        .limit(50);
      if (homeCourseId) q = q.eq('course_id', homeCourseId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as {
        round_id: string;
        played_at: string;
        total_score: number;
        total_par: number;
        hole_count: number | null;
        course_id: string | null;
      }[];
      if (rows.length === 0) return null;
      const best = rows.reduce((a, b) =>
        a.total_score - a.total_par <= b.total_score - b.total_par ? a : b,
      );
      const courseRes = best.course_id
        ? await supabase.from('courses').select('id, name').eq('id', best.course_id).maybeSingle()
        : { data: null, error: null };
      if (courseRes.error) throw courseRes.error;
      return {
        id: best.round_id,
        played_at: best.played_at,
        total_score: best.total_score,
        total_par: best.total_par,
        hole_count: best.hole_count,
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

      // Pull the most recent finished slice from any mutual.
      const sumRes = await supabase
        .from('user_round_summaries')
        .select(
          'round_id, user_id, total_score, total_par, played_at, course_id, hole_count, visibility, is_group',
        )
        .in('user_id', mutualIds)
        .in('player_status', ['joined', 'finished'])
        .eq('is_draft', false)
        .in('visibility', ['mutuals', 'public'])
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
      if (sumRes.error) throw sumRes.error;
      const row = (sumRes.data ?? [])[0] as
        | {
            round_id: string;
            user_id: string;
            total_score: number;
            total_par: number;
            played_at: string;
            course_id: string | null;
            hole_count: number | null;
            visibility: string | null;
            is_group: boolean | null;
          }
        | undefined;
      if (!row) return null;

      const [profileRes, courseRes, fullRoundRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name')
          .eq('id', row.user_id)
          .maybeSingle(),
        row.course_id
          ? supabase.from('courses').select('id, name').eq('id', row.course_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('rounds').select('*').eq('id', row.round_id).maybeSingle(),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (courseRes.error) throw courseRes.error;
      if (fullRoundRes.error) throw fullRoundRes.error;
      const fullRound = fullRoundRes.data as Tables<'rounds'> | null;
      if (!fullRound) return null;

      // Override stroke totals with the mutual's per-player slice (not the host's).
      const round = {
        ...fullRound,
        total_score: row.total_score,
        total_par: row.total_par,
        played_at: row.played_at,
        courses: courseRes.data ? { name: (courseRes.data as { name: string | null }).name } : null,
      };

      return {
        round: round as RegularsPulse['round'],
        owner: profileRes.data as RegularsPulse['owner'],
      };
    },
    enabled: !!viewerId,
  });
}
