-- Keep row identity immutable even when a caller has UPDATE access to its data.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.guard_round_record_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'round_players' THEN
    IF NEW.round_id IS DISTINCT FROM OLD.round_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'player membership identity cannot change' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'joined' AND OLD.status <> 'joined'
      AND EXISTS (SELECT 1 FROM public.rounds WHERE id = NEW.round_id AND is_group AND NOT is_draft)
      AND EXISTS (SELECT 1 FROM public.round_players WHERE round_id = NEW.round_id AND status = 'finished')
      AND NOT EXISTS (SELECT 1 FROM public.round_players WHERE round_id = NEW.round_id AND status = 'joined') THEN
      RAISE EXCEPTION 'this round has finished' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.round_id IS DISTINCT FROM OLD.round_id
      OR NEW.player_id IS DISTINCT FROM OLD.player_id OR NEW.hole_number IS DISTINCT FROM OLD.hole_number THEN
      RAISE EXCEPTION 'score identity cannot change' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER round_players_identity BEFORE UPDATE ON public.round_players
FOR EACH ROW EXECUTE FUNCTION public.guard_round_record_identity();
CREATE TRIGGER round_holes_identity BEFORE UPDATE ON public.round_holes
FOR EACH ROW EXECUTE FUNCTION public.guard_round_record_identity();

DROP POLICY round_holes_update_self_player ON public.round_holes;
CREATE POLICY round_holes_update_self_player ON public.round_holes FOR UPDATE TO authenticated
USING (player_id = auth.uid() AND public.is_in_round(round_id, auth.uid()))
WITH CHECK (player_id = auth.uid() AND public.is_in_round(round_id, auth.uid()));

-- Hosts finish other participants only through the narrow RPC, not arbitrary UPDATE.
DROP POLICY round_players_update_host_finish ON public.round_players;

CREATE OR REPLACE FUNCTION public.force_end_round(p_round_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_host uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'must be authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT user_id INTO v_host FROM public.rounds WHERE id = p_round_id FOR UPDATE;
  IF v_host IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'only host can force-end' USING ERRCODE = '42501';
  END IF;
  UPDATE public.round_players SET status = 'finished', finished_at = COALESCE(finished_at, now())
  WHERE round_id = p_round_id AND status = 'joined';
END;
$$;
REVOKE ALL ON FUNCTION public.force_end_round(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.force_end_round(uuid) TO authenticated;

-- Legacy helpers use unqualified public tables. Pin a trusted path and remove
-- anonymous invocation; these functions remain usable by authenticated policies.
ALTER FUNCTION public.is_in_round(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_mutual_of_any_round_player(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_following(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_following_any_round_player(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_join_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.redeem_join_code(text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.is_in_round(uuid, uuid),
  public.is_mutual_of_any_round_player(uuid, uuid), public.is_following(uuid, uuid),
  public.is_following_any_round_player(uuid, uuid), public.generate_join_code(),
  public.redeem_join_code(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_in_round(uuid, uuid),
  public.is_mutual_of_any_round_player(uuid, uuid), public.generate_join_code(),
  public.redeem_join_code(text, text) TO authenticated;

-- Serialize code redemption and do not reopen a completed group's history.
CREATE OR REPLACE FUNCTION public.redeem_join_code(p_code text, p_tee_box text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_round uuid; v_host uuid; v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'must be authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT id, user_id INTO v_round, v_host FROM public.rounds
    WHERE join_code = upper(trim(p_code)) AND is_group FOR UPDATE;
  IF v_round IS NULL OR public.is_blocked(v_host, auth.uid()) THEN
    RAISE EXCEPTION 'cannot join this round' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO v_status FROM public.round_players
    WHERE round_id = v_round AND user_id = auth.uid();
  IF v_status IN ('joined', 'finished') THEN RETURN v_round; END IF;
  IF EXISTS (SELECT 1 FROM public.round_players WHERE round_id = v_round AND status = 'finished')
    AND NOT EXISTS (SELECT 1 FROM public.round_players WHERE round_id = v_round AND status = 'joined') THEN
    RAISE EXCEPTION 'this round has finished' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.round_players(round_id, user_id, tee_box, status, joined_at)
    VALUES (v_round, auth.uid(), p_tee_box, 'joined', now())
  ON CONFLICT (round_id, user_id) DO UPDATE SET status = 'joined',
    tee_box = EXCLUDED.tee_box, joined_at = COALESCE(public.round_players.joined_at, now());
  RETURN v_round;
END;
$$;

-- Central spectator rule. SECURITY DEFINER avoids policies recursively selecting
-- rounds -> players -> rounds. The viewer is always the authenticated caller.
CREATE FUNCTION public.can_read_round(p_round_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.rounds r WHERE r.id = p_round_id AND (
      r.user_id = auth.uid() OR public.is_in_round(r.id, auth.uid()) OR (
        NOT r.is_draft AND r.visibility <> 'private'
        AND NOT public.is_blocked(r.user_id, auth.uid())
        AND NOT EXISTS (
          SELECT 1 FROM public.round_players p WHERE p.round_id = r.id
          AND p.status IN ('joined', 'finished') AND public.is_blocked(p.user_id, auth.uid())
        )
        AND (NOT r.is_group OR r.live_visible OR (
          EXISTS (SELECT 1 FROM public.round_players p WHERE p.round_id = r.id AND p.status = 'finished')
          AND NOT EXISTS (SELECT 1 FROM public.round_players p WHERE p.round_id = r.id AND p.status = 'joined')
        ))
        AND (r.visibility = 'public' OR public.is_following(auth.uid(), r.user_id)
          OR (r.is_group AND public.is_following_any_round_player(r.id, auth.uid())))
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_read_round(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_round(uuid) TO authenticated;
DROP POLICY rounds_read_visible ON public.rounds;
CREATE POLICY rounds_read_visible ON public.rounds FOR SELECT TO authenticated
USING (public.can_read_round(id));
DROP POLICY round_players_select ON public.round_players;
CREATE POLICY round_players_select ON public.round_players FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_read_round(round_id));
DROP POLICY round_holes_read_via_round ON public.round_holes;
CREATE POLICY round_holes_read_via_round ON public.round_holes FOR SELECT TO authenticated
USING (public.can_read_round(round_id));

-- An inviter leaving the app must not prevent deletion of their account.
ALTER TABLE public.round_players DROP CONSTRAINT round_players_invited_by_fkey;
ALTER TABLE public.round_players ADD CONSTRAINT round_players_invited_by_fkey
FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.round_holes DROP CONSTRAINT round_holes_player_id_fkey;
ALTER TABLE public.round_holes ADD CONSTRAINT round_holes_player_id_fkey
FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
