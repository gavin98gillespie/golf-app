-- ----------------------------------------------------------------------------
-- Phase 7 RPCs: redeem_join_code, force_end_round, generate_join_code
-- ----------------------------------------------------------------------------

-- Generate a 6-character alphanumeric join code, avoiding confusing chars
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    v_code := replace(replace(replace(replace(v_code, '0','2'), 'O','3'), '1','4'), 'I','5');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM rounds WHERE join_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 12 THEN
      RAISE EXCEPTION 'could not generate unique code';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_join_code() TO authenticated;

-- Redeem a join code: idempotent join into a group round.
-- Caller passes their preferred tee_box. Returns the round_id.
CREATE OR REPLACE FUNCTION redeem_join_code(p_code TEXT, p_tee_box TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_round_id UUID;
  v_host_id  UUID;
  v_viewer   UUID := auth.uid();
BEGIN
  IF v_viewer IS NULL THEN
    RAISE EXCEPTION 'must be authenticated';
  END IF;

  SELECT id, user_id INTO v_round_id, v_host_id
  FROM rounds
  WHERE join_code = p_code AND is_group = true;

  IF v_round_id IS NULL THEN
    RAISE EXCEPTION 'invalid join code';
  END IF;

  IF is_blocked(v_host_id, v_viewer) THEN
    RAISE EXCEPTION 'cannot join this round';
  END IF;

  IF EXISTS (SELECT 1 FROM round_players WHERE round_id = v_round_id AND user_id = v_viewer) THEN
    UPDATE round_players
    SET status = 'joined',
        joined_at = COALESCE(joined_at, now()),
        tee_box = p_tee_box
    WHERE round_id = v_round_id
      AND user_id = v_viewer
      AND status IN ('invited','withdrawn');
    RETURN v_round_id;
  END IF;

  INSERT INTO round_players(round_id, user_id, tee_box, status, joined_at)
  VALUES (v_round_id, v_viewer, p_tee_box, 'joined', now());

  RETURN v_round_id;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_join_code(TEXT, TEXT) TO authenticated;

-- Host force-end: sets all 'joined' players to 'finished'. Only callable by host.
CREATE OR REPLACE FUNCTION force_end_round(p_round_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_host_id UUID;
BEGIN
  SELECT user_id INTO v_host_id FROM rounds WHERE id = p_round_id;
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'round not found';
  END IF;
  IF v_host_id <> auth.uid() THEN
    RAISE EXCEPTION 'only host can force-end';
  END IF;

  UPDATE round_players
  SET status = 'finished', finished_at = COALESCE(finished_at, now())
  WHERE round_id = p_round_id AND status = 'joined';
END;
$$;

GRANT EXECUTE ON FUNCTION force_end_round(UUID) TO authenticated;
