ALTER TABLE round_holes ADD COLUMN player_id UUID REFERENCES profiles(id);

UPDATE round_holes rh SET player_id = r.user_id FROM rounds r WHERE rh.round_id = r.id;

ALTER TABLE round_holes ALTER COLUMN player_id SET NOT NULL;

-- The existing unique constraint on (round_id, hole_number); drop and replace.
ALTER TABLE round_holes DROP CONSTRAINT IF EXISTS round_holes_round_id_hole_number_key;

ALTER TABLE round_holes ADD CONSTRAINT round_holes_unique_player_hole UNIQUE (round_id, player_id, hole_number);

-- Backfill round_players: one row per existing round (so all scoring code uses the join table uniformly)
INSERT INTO round_players (round_id, user_id, tee_box, status, joined_at)
SELECT id, user_id, COALESCE(tee_box, 'default'), 'finished', COALESCE(played_at::timestamptz, created_at)
FROM rounds
WHERE id NOT IN (SELECT round_id FROM round_players);
