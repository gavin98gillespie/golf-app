-- Phase 8 follow-up: round_players_select still gated on is_mutual_of_any_round_player,
-- which blocks the feed query from discovering round IDs of followed users.
-- Replace with is_following_any_round_player to match the rest of Bundle C.

DROP POLICY IF EXISTS "round_players_select" ON round_players;

CREATE POLICY "round_players_select"
  ON round_players FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_in_round(round_id, auth.uid())
    OR public.is_following_any_round_player(round_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id AND r.user_id = auth.uid()
    )
  );
