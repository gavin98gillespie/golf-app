-- A group chooses par once per hole. This does not record an unplayed golfer's score.
CREATE TABLE public.round_hole_pars (
 round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
 hole_number smallint NOT NULL CHECK(hole_number BETWEEN 1 AND 18),
 par smallint NOT NULL CHECK(par BETWEEN 3 AND 6),
 PRIMARY KEY(round_id,hole_number)
);
ALTER TABLE public.round_hole_pars ENABLE ROW LEVEL SECURITY;
CREATE POLICY round_pars_read ON public.round_hole_pars FOR SELECT TO authenticated USING(public.can_read_round(round_id));
REVOKE ALL ON public.round_hole_pars FROM anon,authenticated;
GRANT SELECT ON public.round_hole_pars TO authenticated;
CREATE FUNCTION public.get_round_pars(p_round uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT coalesce(jsonb_object_agg(hole_number::text,par),'{}'::jsonb) FROM round_hole_pars WHERE round_id=p_round;
$$;
CREATE FUNCTION public.set_group_hole_par(p_round uuid,p_hole int,p_par int) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE holes int;
BEGIN
 IF NOT can_score_group(p_round) THEN RAISE EXCEPTION 'Only this group can change par.'; END IF;
 SELECT coalesce(hole_count,18) INTO holes FROM rounds WHERE id=p_round FOR UPDATE;
 IF p_hole IS NULL OR p_hole<1 OR p_hole>holes OR p_par IS NULL OR p_par<3 OR p_par>6 THEN RAISE EXCEPTION 'Invalid hole or par.'; END IF;
 INSERT INTO round_hole_pars(round_id,hole_number,par) VALUES(p_round,p_hole,p_par)
 ON CONFLICT(round_id,hole_number) DO UPDATE SET par=excluded.par;
 UPDATE round_holes SET par=p_par WHERE round_id=p_round AND hole_number=p_hole AND par IS DISTINCT FROM p_par;
END;
$$;
CREATE FUNCTION public.apply_shared_hole_par() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE shared_par int;
BEGIN
 -- Serialize score writes with par changes; a stale phone cannot restore the old par.
 PERFORM 1 FROM rounds WHERE id=NEW.round_id FOR UPDATE;
 SELECT par INTO shared_par FROM round_hole_pars WHERE round_id=NEW.round_id AND hole_number=NEW.hole_number;
 IF shared_par IS NOT NULL THEN NEW.par:=shared_par; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER shared_hole_par BEFORE INSERT OR UPDATE ON public.round_holes FOR EACH ROW EXECUTE FUNCTION public.apply_shared_hole_par();
REVOKE ALL ON FUNCTION public.get_round_pars(uuid),public.set_group_hole_par(uuid,int,int),public.apply_shared_hole_par() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_round_pars(uuid),public.set_group_hole_par(uuid,int,int) TO authenticated;
