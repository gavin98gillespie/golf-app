import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase, type Tables, type Inserts } from '@/lib/supabase';

export function useCourseSearch(query: string) {
  return useQuery({
    queryKey: ['courses', 'search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Tables<'courses'>[];
    },
  });
}

export function useNearbyCourses(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ['courses', 'nearby', lat, lng],
    queryFn: async () => {
      if (lat == null || lng == null) return [];
      // Bounding-box query: ~0.3deg ~= 20mi at mid-latitudes. First-pass; we
      // can replace with a haversine RPC later if needed.
      const delta = 0.3;
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .gte('lat', lat - delta)
        .lte('lat', lat + delta)
        .gte('lng', lng - delta)
        .lte('lng', lng + delta)
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Tables<'courses'>[];
    },
    enabled: lat != null && lng != null,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'courses'>, 'source' | 'added_by'>) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('courses')
        .insert({ ...input, source: 'user', added_by: session.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'courses'>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
