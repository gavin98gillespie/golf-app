import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Achievements = {
  eagles: number;
  aces: number;
  albatrosses: number;
  courseBests: { course_id: string; course_name: string; total_score: number; round_id: string }[];
  firstEagleAt: string | null;
  firstAceAt: string | null;
};

const EMPTY: Achievements = {
  eagles: 0,
  aces: 0,
  albatrosses: 0,
  courseBests: [],
  firstEagleAt: null,
  firstAceAt: null,
};

export function useAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ['achievements', userId],
    queryFn: async (): Promise<Achievements> => {
      if (!userId) return EMPTY;

      const roundsRes = await supabase
        .from('rounds')
        .select('id, course_id, total_score, played_at, courses(name)')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .order('played_at', { ascending: true });
      if (roundsRes.error) throw roundsRes.error;
      const rounds = roundsRes.data ?? [];
      if (rounds.length === 0) return EMPTY;

      const ids = rounds.map((r) => r.id);
      const holesRes = await supabase
        .from('round_holes')
        .select('par, score, round_id')
        .in('round_id', ids);
      if (holesRes.error) throw holesRes.error;
      const roundDate = new Map(rounds.map((r) => [r.id, r.played_at]));

      let eagles = 0;
      let aces = 0;
      let albatrosses = 0;
      let firstEagleAt: string | null = null;
      let firstAceAt: string | null = null;
      const sortedHoles = [...(holesRes.data ?? [])].sort((a, b) => {
        const da = roundDate.get(a.round_id) ?? '';
        const db = roundDate.get(b.round_id) ?? '';
        return da.localeCompare(db);
      });
      for (const h of sortedHoles) {
        const diff = h.score - h.par;
        const at = roundDate.get(h.round_id) ?? null;
        if (h.score === 1) {
          aces++;
          if (!firstAceAt) firstAceAt = at;
        }
        if (diff === -2) {
          eagles++;
          if (!firstEagleAt) firstEagleAt = at;
        }
        if (diff <= -3) {
          albatrosses++;
        }
      }

      const bestByCourse = new Map<
        string,
        { course_id: string; course_name: string; total_score: number; round_id: string }
      >();
      for (const r of rounds) {
        const cur = bestByCourse.get(r.course_id);
        if (!cur || r.total_score < cur.total_score) {
          bestByCourse.set(r.course_id, {
            course_id: r.course_id,
            course_name: (r.courses as { name: string } | null)?.name ?? 'Course',
            total_score: r.total_score,
            round_id: r.id,
          });
        }
      }
      return {
        eagles,
        aces,
        albatrosses,
        firstEagleAt,
        firstAceAt,
        courseBests: Array.from(bestByCourse.values()).sort((a, b) => a.total_score - b.total_score),
      };
    },
    enabled: !!userId,
  });
}
