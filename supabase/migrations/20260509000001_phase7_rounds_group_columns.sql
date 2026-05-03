ALTER TABLE rounds ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE rounds ADD COLUMN live_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE rounds ADD COLUMN join_code TEXT UNIQUE;
ALTER TABLE rounds ADD COLUMN invites_locked_at TIMESTAMPTZ;

CREATE INDEX rounds_join_code_idx ON rounds(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX rounds_is_group_idx ON rounds(is_group) WHERE is_group = true;
