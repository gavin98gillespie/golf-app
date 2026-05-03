-- ----------------------------------------------------------------------------
-- Phase 7 RLS — group round visibility helpers + round_players policies +
-- updated rounds/round_holes policies
-- ----------------------------------------------------------------------------

-- Helper: is the viewer in the round (joined or finished)?
CREATE OR REPLACE FUNCTION is_in_round(p_round_id UUID, p_viewer UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM round_players
    WHERE round_id = p_round_id
      AND user_id = p_viewer
      AND status IN ('joined','finished')
  );
$$;

-- Helper: is viewer mutual with any joined/finished player in the round?
-- (Block check applied; viewer not counted as their own match.)
CREATE OR REPLACE FUNCTION is_mutual_of_any_round_player(p_round_id UUID, p_viewer UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM round_players rp
    WHERE rp.round_id = p_round_id
      AND rp.status IN ('joined','finished')
      AND rp.user_id <> p_viewer
      AND are_mutuals(rp.user_id, p_viewer)
      AND NOT is_blocked(rp.user_id, p_viewer)
  );
$$;

-- ----------------------------------------------------------------------------
-- rounds: replace SELECT to also allow in-round users + mutuals-of-any-player
-- ----------------------------------------------------------------------------
DROP POLICY "rounds_read_visible" ON rounds;

CREATE POLICY "rounds_read_visible"
  ON rounds FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (visibility = 'public' AND is_draft = false AND NOT is_blocked(user_id, auth.uid()))
    OR (
      visibility = 'mutuals'
      AND is_draft = false
      AND NOT is_blocked(user_id, auth.uid())
      AND are_mutuals(user_id, auth.uid())
    )
    OR is_in_round(id, auth.uid())
    OR (
      is_group = true
      AND is_draft = false
      AND is_mutual_of_any_round_player(id, auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- round_players: enable RLS + policies
-- ----------------------------------------------------------------------------
ALTER TABLE round_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "round_players_select"
  ON round_players FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_in_round(round_id, auth.uid())
    OR is_mutual_of_any_round_player(round_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id AND r.user_id = auth.uid()
    )
  );

-- Host can insert "invited" rows for mutuals (only while invites not yet locked)
CREATE POLICY "round_players_insert_host"
  ON round_players FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
        AND r.user_id = auth.uid()
        AND r.invites_locked_at IS NULL
    )
    AND status = 'invited'
    AND are_mutuals(auth.uid(), user_id)
    AND NOT is_blocked(auth.uid(), user_id)
  );

-- Self-insert: host's own joined row (auto-create on round creation), or
-- code-redeem path going through SECURITY DEFINER RPC bypasses RLS so we
-- only need this for the host's auto-row.
CREATE POLICY "round_players_insert_self_host"
  ON round_players FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id AND r.user_id = auth.uid()
    )
    AND status = 'joined'
  );

-- Update own row (accept invite, withdraw, finish, edit notes/tee)
CREATE POLICY "round_players_update_self"
  ON round_players FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Host force-end via direct UPDATE (RPC also exists; this gives the same power
-- through normal RLS). Host can set anyone's status to 'finished'.
CREATE POLICY "round_players_update_host_finish"
  ON round_players FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM rounds r WHERE r.id = round_id AND r.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM rounds r WHERE r.id = round_id AND r.user_id = auth.uid())
    AND status = 'finished'
  );

-- Player can decline an invite (delete own row when status='invited')
CREATE POLICY "round_players_delete_self_decline"
  ON round_players FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'invited');

-- Host can delete invites they created (e.g., revoke before lock)
CREATE POLICY "round_players_delete_host_invite"
  ON round_players FOR DELETE TO authenticated
  USING (
    status = 'invited'
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id AND r.user_id = auth.uid() AND r.invites_locked_at IS NULL
    )
  );

-- ----------------------------------------------------------------------------
-- round_holes: replace write policy so any joined/finished player can write
-- their own slice (player_id = auth.uid()).
-- ----------------------------------------------------------------------------
DROP POLICY "round_holes_write_via_round" ON round_holes;

CREATE POLICY "round_holes_insert_self_player"
  ON round_holes FOR INSERT TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM round_players rp
      WHERE rp.round_id = round_holes.round_id
        AND rp.user_id = auth.uid()
        AND rp.status IN ('joined','finished')
    )
  );

CREATE POLICY "round_holes_update_self_player"
  ON round_holes FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "round_holes_delete_self_player"
  ON round_holes FOR DELETE TO authenticated
  USING (player_id = auth.uid());

-- SELECT policy for round_holes already exists (round_holes_read_via_round)
-- and inherits visibility from rounds via the EXISTS subquery; the rounds
-- SELECT policy was just expanded so this transitively works.
