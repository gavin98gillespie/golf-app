import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Returns the next hole number to resume scoring at for a given draft round.
 * If holes 1..N have been scored consecutively, returns N+1. If there are
 * gaps, returns the smallest unscored number. Caps at the course's hole_count.
 */
export function useResumeHole(roundId: string | undefined, totalHoles: number) {
  return useQuery({
    queryKey: ['resume_hole', roundId, totalHoles],
    queryFn: async () => {
      if (!roundId) return 1;
      const { data, error } = await supabase
        .from('round_holes')
        .select('hole_number')
        .eq('round_id', roundId);
      if (error) throw error;
      const scored = new Set((data ?? []).map((r) => r.hole_number));
      for (let n = 1; n <= totalHoles; n++) {
        if (!scored.has(n)) return n;
      }
      return totalHoles;
    },
    enabled: !!roundId,
  });
}
