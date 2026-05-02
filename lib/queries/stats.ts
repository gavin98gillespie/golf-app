import { useQuery } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

type SummarySlice = {
  rounds: number;
  avgScore: number | null;
  bestScore: number | null;
  bestDiff: number | null;
  trendDelta: number | null;
};

const EMPTY_SLICE: SummarySlice = {
  rounds: 0,
  avgScore: null,
  bestScore: null,
  bestDiff: null,
  trendDelta: null,
};

function summarize(scores: number[], diffs: number[]): SummarySlice {
  if (scores.length === 0) return EMPTY_SLICE;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  // scores comes in as newest-first, so last5 = first 5 elements.
  const last5 = scores.slice(0, 5);
  const prev5 = scores.slice(5, 10);
  const trendDelta = last5.length >= 3 && prev5.length >= 3 ? avg(last5) - avg(prev5) : null;
  return {
    rounds: scores.length,
    avgScore: Math.round(avg(scores)),
    bestScore: Math.min(...scores),
    bestDiff: Math.min(...diffs),
    trendDelta,
  };
}

/**
 * Per-hole-count summary stats. Keys are the hole_count values present in
 * the user's history; usually `9` and/or `18`. Each value is a SummarySlice
 * (rounds count, avg, best, bestDiff, trendDelta).
 *
 * Returns null until userId provided. Returns `{}` if user has no rounds.
 */
export function useUserSummaryStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['stats', 'summary', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('total_score, total_par, played_at, courses(hole_count)')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .order('played_at', { ascending: false });
      if (error) throw error;
      const rounds = data ?? [];
      // Group by hole_count
      const groups = new Map<number, { scores: number[]; diffs: number[] }>();
      for (const r of rounds) {
        const hc = (r.courses as { hole_count: number } | null)?.hole_count ?? 18;
        if (!groups.has(hc)) groups.set(hc, { scores: [], diffs: [] });
        const g = groups.get(hc)!;
        g.scores.push(r.total_score);
        g.diffs.push(r.total_score - r.total_par);
      }
      const byHoleCount: Record<number, SummarySlice> = {};
      for (const [hc, g] of groups) {
        byHoleCount[hc] = summarize(g.scores, g.diffs);
      }
      return { byHoleCount, totalRounds: rounds.length };
    },
    enabled: !!userId,
  });
}

export type { SummarySlice };

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
export function useScoreTrend(
  userId: string | undefined,
  options: { limit?: number; holeCount?: number } = {},
) {
  const limit = options.limit ?? 20;
  const holeCount = options.holeCount;
  return useQuery({
    queryKey: ['stats', 'trend', userId, limit, holeCount],
    queryFn: async () => {
      if (!userId) return [];
      const q = supabase
        .from('rounds')
        .select('id, total_score, total_par, played_at, courses(hole_count)')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .order('played_at', { ascending: false })
        .limit(limit * 2); // fetch extra so we have headroom after filtering
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as {
        id: string;
        total_score: number;
        total_par: number;
        played_at: string;
        courses: { hole_count: number } | null;
      }[];
      if (holeCount != null) {
        rows = rows.filter((r) => (r.courses?.hole_count ?? 18) === holeCount);
      }
      // Cap to limit and reverse so oldest first.
      return rows.slice(0, limit).reverse();
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
 * keyed by par (3, 4, 5, 6) → BestForPar (score + round context) or null
 * if the user has never played a hole at that par.
 */
export type BestForPar = {
  score: number;
  par: number;
  round_id: string;
  played_at: string;
  course_name: string;
} | null;

export function useBestPerPar(userId: string | undefined) {
  return useQuery({
    queryKey: ['stats', 'best-per-par', userId],
    queryFn: async (): Promise<Record<number, BestForPar>> => {
      const result: Record<number, BestForPar> = { 3: null, 4: null, 5: null, 6: null };
      if (!userId) return result;

      // Get user's rounds with course names
      const roundsRes = await supabase
        .from('rounds')
        .select('id, played_at, courses(name)')
        .eq('user_id', userId)
        .eq('is_draft', false);
      if (roundsRes.error) throw roundsRes.error;
      const roundMeta = new Map<string, { played_at: string; course_name: string }>();
      for (const r of roundsRes.data ?? []) {
        roundMeta.set(r.id, {
          played_at: r.played_at,
          course_name: (r.courses as { name: string } | null)?.name ?? 'Round',
        });
      }
      if (roundMeta.size === 0) return result;

      const holesRes = await supabase
        .from('round_holes')
        .select('par, score, round_id')
        .in('round_id', Array.from(roundMeta.keys()));
      if (holesRes.error) throw holesRes.error;

      for (const h of holesRes.data ?? []) {
        const meta = roundMeta.get(h.round_id);
        if (!meta) continue;
        const cur = result[h.par];
        if (cur == null || h.score < cur.score) {
          result[h.par] = {
            score: h.score,
            par: h.par,
            round_id: h.round_id,
            played_at: meta.played_at,
            course_name: meta.course_name,
          };
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
