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

export function useHomeCourse(courseId: string | null | undefined) {
  return useQuery({
    queryKey: ['course', 'lite', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'courses'> | null;
    },
    enabled: !!courseId,
  });
}

export function useUpdateHomeCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; courseId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ home_course_id: input.courseId })
        .eq('id', input.userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['profile', vars.userId] });
    },
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_d, userId) => {
      void qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
