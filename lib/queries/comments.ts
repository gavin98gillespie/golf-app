import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

export type CommentWithAuthor = Tables<'comments'> & {
  profiles: Pick<Tables<'profiles'>, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
};

export function useComments(roundId: string | undefined) {
  return useQuery({
    queryKey: ['comments', roundId],
    queryFn: async () => {
      if (!roundId) return [];
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          profiles!comments_user_id_fkey ( id, username, display_name, avatar_url )
          `,
        )
        .eq('round_id', roundId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CommentWithAuthor[];
    },
    enabled: !!roundId,
  });
}

export function usePostComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; roundId: string; body: string }) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: input.userId,
          round_id: input.roundId,
          body: input.body.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.roundId] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { commentId: string; roundId: string }) => {
      const { error } = await supabase.from('comments').delete().eq('id', input.commentId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.roundId] });
    },
  });
}
