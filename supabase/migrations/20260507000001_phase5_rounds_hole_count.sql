-- Round-level hole count. Lets a user play 9 holes at an 18-hole course.
-- NULL means "use course default" — keep nullable for back-compat.

ALTER TABLE rounds
  ADD COLUMN hole_count INT CHECK (hole_count IS NULL OR hole_count IN (9, 18, 27, 36));

-- Backfill: set hole_count from existing round_holes counts. If a round has
-- 9 or fewer scored holes, treat as 9; else 18 (the only common values that
-- existed before this migration).
UPDATE rounds r
SET hole_count = (
  SELECT CASE WHEN COUNT(*) <= 9 THEN 9 ELSE 18 END
  FROM round_holes rh
  WHERE rh.round_id = r.id
)
WHERE hole_count IS NULL AND EXISTS (SELECT 1 FROM round_holes rh WHERE rh.round_id = r.id);
