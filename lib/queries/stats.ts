import { useQuery } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

/**
 * Summary stats for a user's overall performance:
 * - rounds: total count of saved (non-draft) rounds
 * - avgScore: mean total_score across rounds (rounded)
 * - bestScore: minimum total_score
 * - bestDiff: minimum (total_score - total_par)
 * - trendDelta: avg of last 5 minus avg of prior 5 (negative = improving)
 *
 * Returns null until userId is provided. Returns zeroed shape if user has
 * no rounds (so the UI can render "—" placeholders without conditional logic).
 */
export function useUserSummaryStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['stats', 'summary', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('total_score, total_par, played_at')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .order('played_at', { ascending: false });
      if (error) throw error;
      const rounds = data ?? [];
      if (rounds.length === 0) {
        return { rounds: 0, avgScore: null, bestScore: null, bestDiff: null, trendDelta: null };
      }
      const scores = rounds.map((r) => r.total_score);
      const diffs = rounds.map((r) => r.total_score - r.total_par);
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const last5 = scores.slice(0, 5);
      const prev5 = scores.slice(5, 10);
      const trendDelta = last5.length >= 3 && prev5.length >= 3 ? avg(last5) - avg(prev5) : null;
      return {
        rounds: rounds.length,
        avgScore: Math.round(avg(scores)),
        bestScore: Math.min(...scores),
        bestDiff: Math.min(...diffs),
        trendDelta,
      };
    },
    enabled: !!userId,
  });
}

/**
 * The user's best (lowest total_score) round on a specific course.
 * Returns null if the user has never played the course.
 */
export function usePersonalBestAtCourse(userId: string | undefined, courseId: string | undefined) {
  return useQuery({
    queryKey: ['stats', 'personal-best', userId, courseId],
    queryFn: async () => {
      if (!userId || !courseId) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('id, total_score, total_par, played_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('is_draft', false)
        .order('total_score', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!courseId,
  });
}

/**
 * Score trend: an array of completed rounds (oldest → newest), capped to
 * the last `limit` rounds. Used by the trend chart.
 */
export function useScoreTrend(userId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['stats', 'trend', userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('rounds')
        .select('id, total_score, total_par, played_at')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .order('played_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).slice().reverse();
    },
    enabled: !!userId,
  });
}

export type TrendPoint = {
  id: string;
  total_score: number;
  total_par: number;
  played_at: string;
};

/**
 * Best score per par-type across the user's history. Returns an object
 * keyed by par (3, 4, 5, 6) → minimum score on that hole-par across all rounds.
 * Holes the user has never played at a given par return null.
 */
export function useBestPerPar(userId: string | undefined) {
  return useQuery({
    queryKey: ['stats', 'best-per-par', userId],
    queryFn: async (): Promise<Record<number, number | null>> => {
      if (!userId) return { 3: null, 4: null, 5: null, 6: null };
      const roundsRes = await supabase
        .from('rounds')
        .select('id')
        .eq('user_id', userId)
        .eq('is_draft', false);
      if (roundsRes.error) throw roundsRes.error;
      const roundIds = (roundsRes.data ?? []).map((r) => r.id);
      if (roundIds.length === 0) return { 3: null, 4: null, 5: null, 6: null };
      const holesRes = await supabase
        .from('round_holes')
        .select('par, score')
        .in('round_id', roundIds);
      if (holesRes.error) throw holesRes.error;
      const result: Record<number, number | null> = { 3: null, 4: null, 5: null, 6: null };
      for (const h of holesRes.data ?? []) {
        const cur = result[h.par];
        if (cur == null || h.score < cur) {
          result[h.par] = h.score;
        }
      }
      return result;
    },
    enabled: !!userId,
  });
}

/**
 * All of a user's saved rounds at a given course, newest first.
 * Used by the course-detail screen.
 */
export function useUserRoundsAtCourse(userId: string | undefined, courseId: string | undefined) {
  return useQuery({
    queryKey: ['stats', 'user-rounds-at-course', userId, courseId],
    queryFn: async () => {
      if (!userId || !courseId) return [];
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('is_draft', false)
        .order('played_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tables<'rounds'>[];
    },
    enabled: !!userId && !!courseId,
  });
}
