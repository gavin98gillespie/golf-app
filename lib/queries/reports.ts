import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type ReportTargetType = 'round' | 'profile' | 'comment';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

export function useSubmitReport() {
  return useMutation({
    mutationFn: async (input: {
      reporterId: string;
      targetType: ReportTargetType;
      targetId: string;
      reason: ReportReason;
      details?: string;
    }) => {
      const { error } = await supabase.from('reports').insert({
        reporter_id: input.reporterId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
      });
      if (error) throw error;
    },
  });
}
