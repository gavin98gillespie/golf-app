import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type ParBucket = { count: number; avg: number | null; best: number | null };
export type DetailedStats = {
  fairwayPct: number | null;
  girPct: number | null;
  avgPutts: number | null;
  byPar: Record<3 | 4 | 5, ParBucket>;
};

const EMPTY: DetailedStats = {
  fairwayPct: null,
  girPct: null,
  avgPutts: null,
  byPar: {
    3: { count: 0, avg: null, best: null },
    4: { count: 0, avg: null, best: null },
    5: { count: 0, avg: null, best: null },
  },
};

export function useDetailedStats(userId: string | undefined, holeCount?: number) {
  return useQuery({
    queryKey: ['stats', 'detailed', userId, holeCount],
    queryFn: async (): Promise<DetailedStats> => {
      if (!userId) return EMPTY;

      const roundsRes = await supabase
        .from('rounds')
        .select('id, hole_count, courses(hole_count)')
        .eq('user_id', userId)
        .eq('is_draft', false);
      if (roundsRes.error) throw roundsRes.error;
      const rows = roundsRes.data ?? [];
      const filtered = holeCount
        ? rows.filter(
            (r) =>
              ((r as { hole_count: number | null }).hole_count ??
                (r.courses as { hole_count: number } | null)?.hole_count ??
                18) === holeCount,
          )
        : rows;
      const ids = filtered.map((r) => r.id);
      if (ids.length === 0) return EMPTY;

      const holesRes = await supabase
        .from('round_holes')
        .select('par, score, putts, fairway_hit, gir')
        .in('round_id', ids);
      if (holesRes.error) throw holesRes.error;
      const holes = holesRes.data ?? [];

      let fwHit = 0;
      let fwTotal = 0;
      let girHit = 0;
      let girTotal = 0;
      let puttsSum = 0;
      let puttsTotal = 0;
      const sums: Record<number, { sum: number; n: number; min: number }> = {};

      for (const h of holes) {
        if (h.par === 4 || h.par === 5) {
          if (h.fairway_hit !== null) {
            fwTotal++;
            if (h.fairway_hit) fwHit++;
          }
        }
        if (h.gir !== null) {
          girTotal++;
          if (h.gir) girHit++;
        }
        if (h.putts !== null) {
          puttsTotal++;
          puttsSum += h.putts;
        }
        if (h.par === 3 || h.par === 4 || h.par === 5) {
          const s = sums[h.par] ?? { sum: 0, n: 0, min: Infinity };
          s.sum += h.score;
          s.n += 1;
          if (h.score < s.min) s.min = h.score;
          sums[h.par] = s;
        }
      }
      const byPar: DetailedStats['byPar'] = {
        3: { count: 0, avg: null, best: null },
        4: { count: 0, avg: null, best: null },
        5: { count: 0, avg: null, best: null },
      };
      for (const p of [3, 4, 5] as const) {
        const s = sums[p];
        if (s && s.n > 0) {
          byPar[p] = { count: s.n, avg: s.sum / s.n, best: s.min };
        }
      }
      return {
        fairwayPct: fwTotal ? fwHit / fwTotal : null,
        girPct: girTotal ? girHit / girTotal : null,
        avgPutts: puttsTotal ? puttsSum / puttsTotal : null,
        byPar,
      };
    },
    enabled: !!userId,
  });
}
