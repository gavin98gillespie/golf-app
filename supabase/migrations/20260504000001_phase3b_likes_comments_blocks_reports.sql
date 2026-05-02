-- ============================================================================
-- Phase 3b: likes, comments, blocks, reports + symmetric is_blocked helper
-- + RLS updates on profiles, follows, rounds, round_holes to honor blocks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- likes
-- ----------------------------------------------------------------------------
CREATE TABLE likes (
  user_id     UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round_id    UUID         NOT NULL REFERENCES rounds(id)   ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, round_id)
);

CREATE INDEX likes_round_idx ON likes(round_id);

-- ----------------------------------------------------------------------------
-- comments
-- ----------------------------------------------------------------------------
CREATE TABLE comments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    UUID         NOT NULL REFERENCES rounds(id)   ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT         NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX comments_round_idx ON comments(round_id, created_at);

-- ----------------------------------------------------------------------------
-- blocks
-- ----------------------------------------------------------------------------
CREATE TABLE blocks (
  blocker_id  UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX blocks_blocked_idx ON blocks(blocked_id);

-- ----------------------------------------------------------------------------
-- reports
-- ----------------------------------------------------------------------------
CREATE TABLE reports (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type   TEXT         NOT NULL CHECK (target_type IN ('round', 'profile', 'comment')),
  target_id     UUID         NOT NULL,
  reason        TEXT         NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  details       TEXT         CHECK (details IS NULL OR length(details) <= 500),
  status        TEXT         NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX reports_status_idx ON reports(status, created_at);

-- ----------------------------------------------------------------------------
-- is_blocked helper — symmetric. SECURITY DEFINER bypasses RLS on `blocks`
-- so this can be called from inside other RLS policies safely.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_blocked(a UUID, b UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = a AND blocked_id = b)
         OR (blocker_id = b AND blocked_id = a)
    );
  $$;

REVOKE ALL ON FUNCTION public.is_blocked(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_blocked(UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- RLS: likes
-- ----------------------------------------------------------------------------
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_read_via_round"
  ON likes FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid(), likes.user_id)
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = likes.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public'  AND r.is_draft = false)
          OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.are_mutuals(auth.uid(), r.user_id))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

CREATE POLICY "likes_insert_own"
  ON likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = likes.round_id
        AND r.is_draft = false
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public')
          OR (r.visibility = 'mutuals' AND public.are_mutuals(auth.uid(), r.user_id))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

CREATE POLICY "likes_delete_own"
  ON likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: comments
-- ----------------------------------------------------------------------------
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read_via_round"
  ON comments FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid(), comments.user_id)
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = comments.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public'  AND r.is_draft = false)
          OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.are_mutuals(auth.uid(), r.user_id))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

CREATE POLICY "comments_insert_own"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = comments.round_id
        AND r.is_draft = false
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public')
          OR (r.visibility = 'mutuals' AND public.are_mutuals(auth.uid(), r.user_id))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

CREATE POLICY "comments_delete_own"
  ON comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: blocks
-- ----------------------------------------------------------------------------
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_read_own"
  ON blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "blocks_insert_own"
  ON blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks_delete_own"
  ON blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: reports
-- ----------------------------------------------------------------------------
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_read_own"
  ON reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "reports_insert_own"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Replace existing policies to honor blocks
-- ----------------------------------------------------------------------------

DROP POLICY "profiles_read_authenticated" ON profiles;

CREATE POLICY "profiles_read_authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (NOT public.is_blocked(auth.uid(), id));

DROP POLICY "follows_read_authenticated" ON follows;

CREATE POLICY "follows_read_authenticated"
  ON follows FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid(), follower_id)
    AND NOT public.is_blocked(auth.uid(), following_id)
  );

DROP POLICY "rounds_read_visible" ON rounds;

CREATE POLICY "rounds_read_visible"
  ON rounds FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      NOT public.is_blocked(auth.uid(), user_id)
      AND (
        (visibility = 'public'  AND is_draft = false)
        OR (visibility = 'mutuals' AND is_draft = false AND public.are_mutuals(auth.uid(), user_id))
      )
    )
  );

DROP POLICY "round_holes_read_via_round" ON round_holes;

CREATE POLICY "round_holes_read_via_round"
  ON round_holes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_holes.round_id
        AND (
          r.user_id = auth.uid()
          OR (
            NOT public.is_blocked(auth.uid(), r.user_id)
            AND (
              (r.visibility = 'public'  AND r.is_draft = false)
              OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.are_mutuals(auth.uid(), r.user_id))
            )
          )
        )
    )
  );
