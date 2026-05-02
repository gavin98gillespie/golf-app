import { useQuery } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

export type PublicProfile = Pick<
  Tables<'profiles'>,
  'id' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'home_course_id'
>;

export function useSearchUsers(query: string, viewerId: string | undefined) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search_users', trimmed, viewerId],
    queryFn: async () => {
      if (trimmed.length < 2) return [];
      const pattern = `%${trimmed}%`;
      let q = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, home_course_id')
        .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
        .order('username', { ascending: true })
        .limit(20);
      if (viewerId) q = q.neq('id', viewerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PublicProfile[];
    },
    enabled: trimmed.length >= 2,
  });
}

export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['profile_by_username', username],
    queryFn: async () => {
      if (!username) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'profiles'> | null;
    },
    enabled: !!username,
  });
}
