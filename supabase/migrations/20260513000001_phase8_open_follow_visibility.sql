-- ============================================================================
-- Phase 8: Switch from mutual-required to one-way follow visibility.
-- Existing visibility='mutuals' rows now mean "viewers who follow the owner
-- can see." Block still gates both directions.
-- ============================================================================

-- ---- Helper: one-way is_following ----
CREATE OR REPLACE FUNCTION public.is_following(p_viewer UUID, p_target UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = p_viewer AND following_id = p_target
  );
$$;
REVOKE ALL ON FUNCTION public.is_following(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_following(UUID, UUID) TO authenticated;

-- ---- Helper: is the viewer following any joined/finished player in a round? ----
-- Replaces is_mutual_of_any_round_player. We KEEP the old function for now so
-- nothing referencing it errors during transition; it is no longer wired into
-- any policy after this migration.
CREATE OR REPLACE FUNCTION public.is_following_any_round_player(p_round_id UUID, p_viewer UUID)
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
      AND public.is_following(p_viewer, rp.user_id)
      AND NOT public.is_blocked(rp.user_id, p_viewer)
  );
$$;
REVOKE ALL ON FUNCTION public.is_following_any_round_player(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_following_any_round_player(UUID, UUID) TO authenticated;

-- ---- rounds: replace SELECT policy ----
DROP POLICY "rounds_read_visible" ON rounds;
CREATE POLICY "rounds_read_visible"
  ON rounds FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (visibility = 'public' AND is_draft = false AND NOT public.is_blocked(user_id, auth.uid()))
    OR (
      visibility = 'mutuals'
      AND is_draft = false
      AND NOT public.is_blocked(user_id, auth.uid())
      AND public.is_following(auth.uid(), user_id)
    )
    OR public.is_in_round(id, auth.uid())
    OR (
      is_group = true
      AND is_draft = false
      AND public.is_following_any_round_player(id, auth.uid())
    )
  );

-- ---- round_players: relax host-invite policy from mutual-required to follows-required ----
-- A host can invite anyone they follow (block check still applies).
DROP POLICY "round_players_insert_host" ON round_players;
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
    AND public.is_following(auth.uid(), user_id)
    AND NOT public.is_blocked(auth.uid(), user_id)
  );

-- ---- likes: replace select + insert policies ----
-- Real policy names: likes_read_via_round, likes_insert_own
-- Preserving the NOT is_blocked(auth.uid(), likes.user_id) branch on SELECT.
DROP POLICY IF EXISTS "likes_read_via_round" ON likes;
CREATE POLICY "likes_read_via_round"
  ON likes FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid(), likes.user_id)
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = likes.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public' AND r.is_draft = false)
          OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.is_following(auth.uid(), r.user_id))
          OR public.is_in_round(r.id, auth.uid())
          OR (r.is_group = true AND r.is_draft = false AND public.is_following_any_round_player(r.id, auth.uid()))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

DROP POLICY IF EXISTS "likes_insert_own" ON likes;
CREATE POLICY "likes_insert_own"
  ON likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = likes.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public' AND r.is_draft = false)
          OR (r.visibility = 'mutuals' AND public.is_following(auth.uid(), r.user_id))
          OR public.is_in_round(r.id, auth.uid())
          OR (r.is_group = true AND r.is_draft = false AND public.is_following_any_round_player(r.id, auth.uid()))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

-- ---- comments: replace select + insert policies ----
-- Real policy names: comments_read_via_round, comments_insert_own
-- Preserving the NOT is_blocked(auth.uid(), comments.user_id) branch on SELECT.
DROP POLICY IF EXISTS "comments_read_via_round" ON comments;
CREATE POLICY "comments_read_via_round"
  ON comments FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid(), comments.user_id)
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = comments.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public' AND r.is_draft = false)
          OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.is_following(auth.uid(), r.user_id))
          OR public.is_in_round(r.id, auth.uid())
          OR (r.is_group = true AND r.is_draft = false AND public.is_following_any_round_player(r.id, auth.uid()))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = comments.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public' AND r.is_draft = false)
          OR (r.visibility = 'mutuals' AND public.is_following(auth.uid(), r.user_id))
          OR public.is_in_round(r.id, auth.uid())
          OR (r.is_group = true AND r.is_draft = false AND public.is_following_any_round_player(r.id, auth.uid()))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

-- ---- round_holes: replace SELECT policy ----
-- Real policy name: round_holes_read_via_round
DROP POLICY IF EXISTS "round_holes_read_via_round" ON round_holes;
CREATE POLICY "round_holes_read_via_round"
  ON round_holes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_holes.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public' AND r.is_draft = false AND NOT public.is_blocked(auth.uid(), r.user_id))
          OR (r.visibility = 'mutuals' AND r.is_draft = false AND NOT public.is_blocked(auth.uid(), r.user_id) AND public.is_following(auth.uid(), r.user_id))
          OR public.is_in_round(r.id, auth.uid())
          OR (r.is_group = true AND r.is_draft = false AND public.is_following_any_round_player(r.id, auth.uid()))
        )
    )
  );
