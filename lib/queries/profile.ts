import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase, type Tables, type Inserts } from '@/lib/supabase';

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'profiles'> | null;
    },
    enabled: !!userId,
  });
}

export function useCheckUsername() {
  return useMutation({
    mutationFn: async (username: string) => {
      const { data, error } = await supabase.rpc('is_username_available', {
        check_username: username,
      });
      if (error) throw error;
      return data as boolean;
    },
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Inserts<'profiles'>) => {
      const { data, error } = await supabase.from('profiles').insert(input).select().single();
      if (error) throw error;
      return data as Tables<'profiles'>;
    },
    onSuccess: (profile) => {
      qc.setQueryData(['profile', profile.id], profile);
    },
  });
}
