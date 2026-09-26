import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/hooks/useSession';
import { supabase } from '@/lib/supabase';
export function useSideGames(roundId: string) {
  const { session } = useSession();
  return useQuery({
    queryKey: ['sideGames', roundId, session?.user.id],
    enabled: !!roundId && !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('round_side_games')
        .select('*')
        .eq('round_id', roundId)
        .order('edited_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
