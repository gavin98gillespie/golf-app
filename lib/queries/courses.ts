import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

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

export type NearbyCourse = Tables<'courses'> & { distanceMi: number };

export function useNearbyCourses(limitMi = 25) {
  return useQuery({
    queryKey: ['nearby_courses', limitMi],
    queryFn: async (): Promise<NearbyCourse[]> => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return [];
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;

      // Bbox for cheap server-side filter, then exact distance + sort client-side.
      const dLat = limitMi / 69;
      const dLng = limitMi / (69 * Math.cos((latitude * Math.PI) / 180));
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .gte('lat', latitude - dLat)
        .lte('lat', latitude + dLat)
        .gte('lng', longitude - dLng)
        .lte('lng', longitude + dLng)
        .limit(80);
      if (error) throw error;

      const withDist: NearbyCourse[] = (data ?? [])
        .filter((c): c is Tables<'courses'> => c.lat != null && c.lng != null)
        .map((c) => ({
          ...c,
          distanceMi: haversine(latitude, longitude, Number(c.lat), Number(c.lng)),
        }));
      return withDist
        .filter((c) => c.distanceMi <= limitMi)
        .sort((a, b) => a.distanceMi - b.distanceMi)
        .slice(0, 30);
    },
    staleTime: 5 * 60 * 1000,
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useRecentCourses(userId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['courses', 'recent', userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      // Get the user's most recent N rounds with their course joined.
      const { data, error } = await supabase
        .from('rounds')
        .select('course_id, played_at, courses(*)')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .order('played_at', { ascending: false })
        .limit(limit * 3); // fetch extra so we have headroom after dedupe
      if (error) throw error;
      // De-duplicate by course_id, keeping the first (most recent) occurrence.
      const seen = new Set<string>();
      const result: Tables<'courses'>[] = [];
      for (const row of data ?? []) {
        if (!row.course_id || seen.has(row.course_id)) continue;
        seen.add(row.course_id);
        if (row.courses) result.push(row.courses as Tables<'courses'>);
        if (result.length >= limit) break;
      }
      return result;
    },
    enabled: !!userId,
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
