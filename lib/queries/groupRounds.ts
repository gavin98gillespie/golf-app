import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase, type Tables, type Inserts } from '@/lib/supabase';

export type GroupRoundPlayer = Tables<'round_players'> & {
  profile: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export type GroupRound = {
  round: Tables<'rounds'>;
  players: GroupRoundPlayer[];
  holes: Tables<'round_holes'>[];
};

export function useCreateGroupRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      hostId: string;
      course_id: string;
      tee_box: string;
      hole_count: number;
      live_visible: boolean;
      played_at: string;
    }) => {
      const { data: code, error: codeErr } = await supabase.rpc('generate_join_code');
      if (codeErr) throw codeErr;

      const { data: round, error: rErr } = await supabase
        .from('rounds')
        .insert({
          user_id: input.hostId,
          course_id: input.course_id,
          tee_box: input.tee_box,
          hole_count: input.hole_count,
          played_at: input.played_at,
          is_group: true,
          live_visible: input.live_visible,
          join_code: code,
          is_draft: true,
          total_score: 0,
          total_par: 0,
        })
        .select()
        .single();
      if (rErr) throw rErr;

      const { error: pErr } = await supabase.from('round_players').insert({
        round_id: round.id,
        user_id: input.hostId,
        tee_box: input.tee_box,
        status: 'joined',
        joined_at: new Date().toISOString(),
      } as Inserts<'round_players'>);
      if (pErr) throw pErr;

      return round as Tables<'rounds'>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}

export function useGroupRound(roundId: string | undefined) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['groupRound', roundId],
    queryFn: async (): Promise<GroupRound | null> => {
      if (!roundId) return null;
      const [roundRes, playersRes, holesRes] = await Promise.all([
        supabase.from('rounds').select('*').eq('id', roundId).single(),
        supabase
          .from('round_players')
          .select(
            '*, profile:profiles!round_players_user_id_fkey(id, display_name, username, avatar_url)',
          )
          .eq('round_id', roundId),
        supabase.from('round_holes').select('*').eq('round_id', roundId),
      ]);
      if (roundRes.error) throw roundRes.error;
      if (playersRes.error) throw playersRes.error;
      if (holesRes.error) throw holesRes.error;
      return {
        round: roundRes.data as Tables<'rounds'>,
        players: (playersRes.data ?? []) as GroupRoundPlayer[],
        holes: (holesRes.data ?? []) as Tables<'round_holes'>[],
      };
    },
    enabled: !!roundId,
  });

  useEffect(() => {
    if (!roundId) return;
    const channelKey = `round:${roundId}:${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rounds',
          filter: `id=eq.${roundId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ['groupRound', roundId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_players',
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ['groupRound', roundId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_holes',
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ['groupRound', roundId] });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED')
          void qc.invalidateQueries({ queryKey: ['groupRound', roundId] });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roundId, qc]);

  return q;
}

export function useInviteToRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      roundId: string;
      userId: string;
      teeBox: string;
      invitedBy: string;
    }) => {
      const { error } = await supabase.from('round_players').insert({
        round_id: input.roundId,
        user_id: input.userId,
        tee_box: input.teeBox,
        status: 'invited',
        invited_by: input.invitedBy,
      } as Inserts<'round_players'>);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
    },
  });
}

export function useJoinViaCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { code: string; teeBox: string }) => {
      const { data, error } = await supabase.rpc('redeem_join_code', {
        p_code: input.code,
        p_tee_box: input.teeBox,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string }) => {
      const { error } = await supabase
        .from('round_players')
        .update({ status: 'joined', joined_at: new Date().toISOString() })
        .eq('round_id', input.roundId)
        .eq('user_id', input.userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
      void qc.invalidateQueries({ queryKey: ['pendingInvites'] });
    },
  });
}

export function useDeclineInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string }) => {
      const { error } = await supabase
        .from('round_players')
        .delete()
        .eq('round_id', input.roundId)
        .eq('user_id', input.userId)
        .eq('status', 'invited');
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pendingInvites'] });
    },
  });
}

export function useWithdrawFromRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string }) => {
      const { error } = await supabase
        .from('round_players')
        .update({ status: 'withdrawn' })
        .eq('round_id', input.roundId)
        .eq('user_id', input.userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
      void qc.invalidateQueries({ queryKey: ['rounds'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}

export function useDeleteMySlice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string }) => {
      // Delete this user's hole rows first (FK-safe even though there is no
      // strict FK from round_holes to round_players).
      const { error: hErr } = await supabase
        .from('round_holes')
        .delete()
        .eq('round_id', input.roundId)
        .eq('player_id', input.userId);
      if (hErr) throw hErr;
      const { error: pErr } = await supabase
        .from('round_players')
        .delete()
        .eq('round_id', input.roundId)
        .eq('user_id', input.userId);
      if (pErr) throw pErr;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
      void qc.invalidateQueries({ queryKey: ['rounds'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['achievements'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useFinishMySlice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string }) => {
      const { error } = await supabase
        .from('round_players')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('round_id', input.roundId)
        .eq('user_id', input.userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
      void qc.invalidateQueries({ queryKey: ['rounds'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}

export function useForceEndRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string }) => {
      const { error } = await supabase.rpc('force_end_round', { p_round_id: input.roundId });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
      void qc.invalidateQueries({ queryKey: ['rounds'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}

export function useStartGroupRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string }) => {
      const { error } = await supabase
        .from('rounds')
        .update({ invites_locked_at: new Date().toISOString(), is_draft: false })
        .eq('id', input.roundId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
    },
  });
}
