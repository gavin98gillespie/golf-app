-- ============================================================================
-- Phase 3a: follows table, mutuals helper, and expanded read policies on
-- rounds + round_holes so mutuals can read each other's mutuals-visible rounds.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- follows
-- ----------------------------------------------------------------------------
CREATE TABLE follows (
  follower_id   UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id  UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX follows_following_idx ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_read_authenticated"
  ON follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "follows_insert_own"
  ON follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "follows_delete_own"
  ON follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- ----------------------------------------------------------------------------
-- are_mutuals helper
-- SECURITY DEFINER so the function bypasses RLS on follows. Safe because the
-- function only returns a boolean and never leaks rows. Needed so other RLS
-- policies can call it without infinite recursion.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.are_mutuals(a UUID, b UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM follows WHERE follower_id = a AND following_id = b
    ) AND EXISTS (
      SELECT 1 FROM follows WHERE follower_id = b AND following_id = a
    );
  $$;

REVOKE ALL ON FUNCTION public.are_mutuals(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.are_mutuals(UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- Expand rounds read policy: owner OR public OR (mutuals + are_mutuals)
-- ----------------------------------------------------------------------------
DROP POLICY "rounds_read_own" ON rounds;

CREATE POLICY "rounds_read_visible"
  ON rounds FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (visibility = 'public'  AND is_draft = false)
    OR (visibility = 'mutuals' AND is_draft = false AND public.are_mutuals(auth.uid(), user_id))
  );

-- ----------------------------------------------------------------------------
-- Expand round_holes read policy to inherit
-- ----------------------------------------------------------------------------
DROP POLICY "round_holes_read_via_round" ON round_holes;

CREATE POLICY "round_holes_read_via_round"
  ON round_holes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_holes.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public'  AND r.is_draft = false)
          OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.are_mutuals(auth.uid(), r.user_id))
        )
    )
  );
