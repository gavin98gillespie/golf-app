-- ============================================================================
-- Phase 1 schema: profiles, courses, course_holes, rounds, round_holes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
  id              UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT         UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  display_name    TEXT         NOT NULL CHECK (length(display_name) BETWEEN 1 AND 60),
  avatar_url      TEXT,
  bio             TEXT         CHECK (bio IS NULL OR length(bio) <= 280),
  home_course_id  UUID,
  is_private      BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX profiles_username_idx ON profiles(username);

-- ----------------------------------------------------------------------------
-- courses
-- ----------------------------------------------------------------------------
CREATE TABLE courses (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  city            TEXT,
  state           TEXT,
  country         TEXT         NOT NULL DEFAULT 'US',
  lat             NUMERIC(9,6),
  lng             NUMERIC(9,6),
  hole_count      INT          NOT NULL DEFAULT 18 CHECK (hole_count IN (9, 18, 27, 36)),
  source          TEXT         NOT NULL CHECK (source IN ('osm', 'user')),
  added_by        UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  verified        BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX courses_name_trgm_idx     ON courses USING gin (name gin_trgm_ops);
CREATE INDEX courses_lat_lng_idx       ON courses(lat, lng);
CREATE INDEX courses_country_state_idx ON courses(country, state);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_home_course_fkey
  FOREIGN KEY (home_course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- course_holes
-- ----------------------------------------------------------------------------
CREATE TABLE course_holes (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number     INT          NOT NULL CHECK (hole_number BETWEEN 1 AND 36),
  par             INT          NOT NULL CHECK (par BETWEEN 3 AND 6),
  yardage         INT          CHECK (yardage IS NULL OR yardage > 0),
  tee_box         TEXT         NOT NULL DEFAULT 'default',
  UNIQUE (course_id, hole_number, tee_box)
);

CREATE INDEX course_holes_course_idx ON course_holes(course_id);

-- ----------------------------------------------------------------------------
-- rounds
-- ----------------------------------------------------------------------------
CREATE TABLE rounds (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id       UUID         NOT NULL REFERENCES courses(id),
  tee_box         TEXT         NOT NULL DEFAULT 'default',
  played_at       DATE         NOT NULL DEFAULT current_date,
  total_score     INT          NOT NULL DEFAULT 0,
  total_par       INT          NOT NULL DEFAULT 0,
  notes           TEXT         CHECK (notes IS NULL OR length(notes) <= 500),
  visibility      TEXT         NOT NULL DEFAULT 'mutuals' CHECK (visibility IN ('private', 'mutuals', 'public')),
  is_draft        BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX rounds_user_played_idx ON rounds(user_id, played_at DESC);
CREATE INDEX rounds_user_draft_idx  ON rounds(user_id, is_draft) WHERE is_draft = true;

-- ----------------------------------------------------------------------------
-- round_holes
-- ----------------------------------------------------------------------------
CREATE TABLE round_holes (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id        UUID         NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  hole_number     INT          NOT NULL CHECK (hole_number BETWEEN 1 AND 36),
  score           INT          NOT NULL CHECK (score BETWEEN 1 AND 20),
  par             INT          NOT NULL CHECK (par BETWEEN 3 AND 6),
  putts           INT          CHECK (putts IS NULL OR putts BETWEEN 0 AND 10),
  fairway_hit     BOOLEAN,
  gir             BOOLEAN,
  UNIQUE (round_id, hole_number)
);

CREATE INDEX round_holes_round_idx ON round_holes(round_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

CREATE TRIGGER rounds_set_updated_at
  BEFORE UPDATE ON rounds FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
