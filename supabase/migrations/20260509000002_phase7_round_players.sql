CREATE TABLE round_players (
  round_id     UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tee_box      TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('invited','joined','withdrawn','finished')),
  notes        TEXT CHECK (notes IS NULL OR length(notes) <= 500),
  joined_at    TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  invited_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (round_id, user_id)
);

CREATE INDEX round_players_user_status_idx ON round_players(user_id, status);
CREATE INDEX round_players_round_idx ON round_players(round_id);
