-- Allow a player to remove themselves from any round regardless of status.
-- Used by "Delete my round" on group round detail (per-user soft-removal of
-- their slice — round persists for other players).
-- The existing round_players_delete_self_decline policy is now a strict subset
-- of this; we leave it in place as a no-op for clarity.
CREATE POLICY "round_players_delete_self_any"
  ON round_players FOR DELETE TO authenticated
  USING (user_id = auth.uid());
