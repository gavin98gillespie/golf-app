-- INSERT ... RETURNING checks SELECT policies against the new row. The
-- STABLE can_read_round helper queries a snapshot that cannot yet see it.
-- Check ownership directly on that row; retain the existing spectator rule.
ALTER POLICY rounds_read_visible ON public.rounds
  USING (user_id = (SELECT auth.uid()) OR public.can_read_round(id));
