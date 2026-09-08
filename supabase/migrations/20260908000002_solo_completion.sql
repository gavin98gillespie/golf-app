-- Existing clients finalize via rounds.UPDATE. Keep that API while calculating
-- totals and finishing the host's participant record in the same transaction.
CREATE FUNCTION public.finalize_solo_round()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_count int; v_score int; v_par int;
BEGIN
  IF NOT NEW.is_group AND OLD.is_draft AND NOT NEW.is_draft THEN
    IF NEW.hole_count IS NULL THEN
      SELECT hole_count INTO NEW.hole_count FROM public.courses WHERE id = NEW.course_id;
    END IF;
    SELECT count(*), COALESCE(sum(score), 0), COALESCE(sum(par), 0)
      INTO v_count, v_score, v_par FROM public.round_holes
      WHERE round_id = NEW.id AND player_id = NEW.user_id
        AND hole_number BETWEEN 1 AND NEW.hole_count;
    IF v_count <> NEW.hole_count THEN
      RAISE EXCEPTION 'Record every hole before finishing your round' USING ERRCODE = '23514';
    END IF;
    NEW.total_score := v_score;
    NEW.total_par := v_par;
    UPDATE public.round_players SET status = 'finished', finished_at = now()
      WHERE round_id = NEW.id AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Round participant is missing' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rounds_finalize_solo BEFORE UPDATE ON public.rounds
FOR EACH ROW EXECUTE FUNCTION public.finalize_solo_round();

-- Repair the completed solo rows produced by the previous client finalizer.
UPDATE public.round_players p SET status = 'finished',
  finished_at = COALESCE(p.finished_at, r.updated_at)
FROM public.rounds r WHERE r.id = p.round_id AND r.user_id = p.user_id
AND NOT r.is_group AND NOT r.is_draft AND p.status = 'joined';
