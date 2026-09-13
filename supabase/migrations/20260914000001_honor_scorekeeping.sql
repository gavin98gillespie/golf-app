-- One scorekeeper can record the whole group. Guests are people, not fake accounts.
CREATE TABLE public.guest_players (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 60),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guest_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_owner ON public.guest_players FOR ALL TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.guest_players TO authenticated;
ALTER TABLE public.round_players ADD COLUMN profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.round_players ADD COLUMN guest_id uuid REFERENCES public.guest_players(id) ON DELETE CASCADE;
UPDATE public.round_players SET profile_id=user_id;
ALTER TABLE public.round_players DROP CONSTRAINT round_players_user_id_fkey;
ALTER TABLE public.round_players ADD CONSTRAINT participant_identity CHECK ((profile_id IS NOT NULL AND profile_id=user_id AND guest_id IS NULL) OR (guest_id IS NOT NULL AND guest_id=user_id AND profile_id IS NULL));
ALTER TABLE public.round_holes DROP CONSTRAINT round_holes_player_id_fkey;
ALTER TABLE public.round_holes ADD CONSTRAINT round_holes_participant_fkey FOREIGN KEY(round_id,player_id) REFERENCES public.round_players(round_id,user_id) ON DELETE CASCADE;
ALTER TABLE public.round_holes ADD COLUMN edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.round_holes ADD COLUMN edited_at timestamptz;

CREATE FUNCTION public.can_score_group(p_round uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM rounds r WHERE r.id=p_round AND r.is_group AND (r.user_id=auth.uid() OR EXISTS(SELECT 1 FROM round_players p WHERE p.round_id=r.id AND p.profile_id=auth.uid() AND p.status IN('joined','finished'))));
$$;
CREATE FUNCTION public.set_participant_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.profile_id IS DISTINCT FROM OLD.profile_id OR NEW.guest_id IS DISTINCT FROM OLD.guest_id) THEN RAISE EXCEPTION 'Participant identity cannot change.'; END IF;
 IF TG_OP='INSERT' THEN
  IF EXISTS(SELECT 1 FROM profiles WHERE id=NEW.user_id) THEN NEW.profile_id:=NEW.user_id;NEW.guest_id:=null;
  ELSIF EXISTS(SELECT 1 FROM guest_players gp JOIN rounds r ON r.user_id=gp.owner_id WHERE gp.id=NEW.user_id AND r.id=NEW.round_id) THEN NEW.guest_id:=NEW.user_id;NEW.profile_id:=null;
  ELSE RAISE EXCEPTION 'Choose an account or a guest belonging to this scorekeeper.'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER participant_identity_fill BEFORE INSERT OR UPDATE ON round_players FOR EACH ROW EXECUTE FUNCTION set_participant_identity();
CREATE POLICY guest_in_round ON guest_players FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM round_players p WHERE p.guest_id=guest_players.id AND can_read_round(p.round_id)));
CREATE POLICY group_score_insert ON round_holes FOR INSERT TO authenticated WITH CHECK(can_score_group(round_id));
CREATE POLICY group_score_update ON round_holes FOR UPDATE TO authenticated USING(can_score_group(round_id)) WITH CHECK(can_score_group(round_id));
CREATE POLICY group_score_delete ON round_holes FOR DELETE TO authenticated USING(can_score_group(round_id));
CREATE POLICY group_player_update ON round_players FOR UPDATE TO authenticated USING(can_score_group(round_id)) WITH CHECK(can_score_group(round_id));
CREATE POLICY group_player_delete ON round_players FOR DELETE TO authenticated USING(can_score_group(round_id));
CREATE FUNCTION public.stamp_score_editor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' OR (NEW.score,NEW.par,NEW.putts,NEW.gir,NEW.fairway_hit) IS DISTINCT FROM (OLD.score,OLD.par,OLD.putts,OLD.gir,OLD.fairway_hit) THEN
 NEW.edited_by:=auth.uid();NEW.edited_at:=now();
 ELSE NEW.edited_by:=CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE id=OLD.edited_by) THEN OLD.edited_by ELSE null END;NEW.edited_at:=OLD.edited_at;END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER score_editor BEFORE INSERT OR UPDATE ON round_holes FOR EACH ROW EXECUTE FUNCTION stamp_score_editor();

CREATE FUNCTION public.add_round_player(p_round uuid,p_user uuid DEFAULT null,p_guest_name text DEFAULT null) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r rounds; pid uuid;
BEGIN
 SELECT * INTO r FROM rounds WHERE id=p_round FOR UPDATE;
 IF NOT can_score_group(p_round) THEN RAISE EXCEPTION 'Only this group can add players.'; END IF;
 IF p_user IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM profiles WHERE id=p_user) THEN
   IF is_blocked(auth.uid(),p_user) THEN RAISE EXCEPTION 'Cannot add this player.';END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM guest_players WHERE id=p_user AND owner_id=r.user_id) THEN RAISE EXCEPTION 'Player not found.'; END IF;
  pid:=p_user;
 ELSE
  IF p_guest_name IS NULL OR length(trim(p_guest_name)) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Enter a guest name (1–60 characters).'; END IF;
  INSERT INTO guest_players(owner_id,display_name) VALUES(r.user_id,trim(p_guest_name)) RETURNING id INTO pid;
 END IF;
 INSERT INTO round_players(round_id,user_id,tee_box,status,joined_at,invited_by) VALUES(p_round,pid,r.tee_box,'joined',now(),auth.uid())
 ON CONFLICT(round_id,user_id) DO NOTHING;
 RETURN pid;
END; $$;

ALTER TABLE round_games ADD COLUMN stake numeric(12,2) NOT NULL DEFAULT 1 CHECK(stake>0 AND stake<=1000000);
ALTER TABLE brass_entries ALTER COLUMN brass TYPE numeric(12,2);

-- Replace individual consent with automatic results when the scorekeeper finishes.
CREATE FUNCTION public.refresh_honor_skins(p_round uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games; v_result jsonb;
BEGIN
 SELECT * INTO g FROM round_games WHERE round_id=p_round FOR UPDATE;
 IF g.round_id IS NULL OR g.state IN('setup','void','settled') THEN RETURN; END IF;
 v_result:=calculate_skins_result(p_round);
 IF NOT (v_result->>'allScoresPresent')::boolean OR EXISTS(SELECT 1 FROM round_game_players p LEFT JOIN round_players rp ON rp.round_id=p.round_id AND rp.user_id=p.user_id WHERE p.round_id=p_round AND rp.status IS DISTINCT FROM 'finished') THEN RETURN; END IF;
 INSERT INTO brass_entries(round_id,revision,award_key,from_user,to_user,brass,hole,kind)
 SELECT p_round,g.revision,v->>'awardKey',(v->>'from')::uuid,(v->>'to')::uuid,(v->>'brass')::numeric,(v->>'hole')::int,'award' FROM jsonb_array_elements(v_result->'transfers')v;
 UPDATE round_games SET state='settled',result=v_result,settled_at=now() WHERE round_id=p_round;
END; $$;
-- Preserve the versioned rules calculator; scale units exactly once on the server.
ALTER FUNCTION public.calculate_skins_result(uuid) RENAME TO calculate_skins_units;
CREATE FUNCTION public.calculate_skins_result(p_round uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; stake numeric; v jsonb; transfers jsonb:='[]'; balances jsonb:='{}';
BEGIN
 r:=calculate_skins_units(p_round);SELECT g.stake INTO stake FROM round_games g WHERE round_id=p_round;
 FOR v IN SELECT value FROM jsonb_array_elements(r->'transfers') LOOP transfers:=transfers||jsonb_build_array(v||jsonb_build_object('brass',(v->>'brass')::numeric*stake));END LOOP;
 SELECT coalesce(jsonb_object_agg(key,(value::text)::numeric*stake),'{}') INTO balances FROM jsonb_each(r->'balances');
 RETURN r||jsonb_build_object('transfers',transfers,'balances',balances);
END; $$;
CREATE OR REPLACE FUNCTION public.skins_round_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games;
BEGIN
 SELECT * INTO g FROM round_games WHERE round_id=OLD.id FOR UPDATE;
 IF g.round_id IS NULL OR g.state='void' THEN IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 IF TG_OP='DELETE' THEN PERFORM invalidate_skins(OLD.id,true);RETURN OLD;END IF;
 IF NEW.course_id IS DISTINCT FROM OLD.course_id OR NEW.hole_count IS DISTINCT FROM OLD.hole_count OR NEW.is_group IS DISTINCT FROM OLD.is_group THEN RAISE EXCEPTION 'Remove skins before changing the course or holes.'; END IF;
 IF g.state='setup' AND (NEW.invites_locked_at IS NOT NULL OR NOT NEW.is_draft) THEN UPDATE round_games SET state='active' WHERE round_id=OLD.id; END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.skins_score_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid;pid uuid;g round_games;
BEGIN
 IF TG_OP='UPDATE' AND NEW.score=OLD.score THEN RETURN NEW; END IF;
 IF TG_OP='DELETE' THEN rid:=OLD.round_id;pid:=OLD.player_id;ELSE rid:=NEW.round_id;pid:=NEW.player_id;END IF;
 SELECT * INTO g FROM round_games WHERE round_id=rid FOR UPDATE;
 IF EXISTS(SELECT 1 FROM round_game_players WHERE round_id=rid AND user_id=pid) AND g.state<>'void' THEN PERFORM invalidate_skins(rid,false);END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END; $$;
CREATE FUNCTION public.after_honor_score() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM refresh_honor_skins(CASE WHEN TG_OP='DELETE' THEN OLD.round_id ELSE NEW.round_id END);RETURN null;END; $$;
CREATE TRIGGER honor_score_refresh AFTER INSERT OR UPDATE OR DELETE ON round_holes FOR EACH ROW EXECUTE FUNCTION after_honor_score();
CREATE TRIGGER honor_player_refresh AFTER UPDATE ON round_players FOR EACH ROW EXECUTE FUNCTION after_honor_score();

CREATE FUNCTION public.finish_group_round(p_round uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r rounds;
BEGIN
 SELECT * INTO r FROM rounds WHERE id=p_round FOR UPDATE;
 IF NOT can_score_group(p_round) THEN RAISE EXCEPTION 'Only this group can finish the round.';END IF;
 IF EXISTS(SELECT 1 FROM round_players p WHERE p.round_id=p_round AND p.status IN('joined','finished') AND (SELECT count(*) FROM round_holes h WHERE h.round_id=p_round AND h.player_id=p.user_id AND h.hole_number BETWEEN 1 AND r.hole_count) <> r.hole_count) THEN RAISE EXCEPTION 'Record every hole for each player, or remove players who did not play.';END IF;
 UPDATE rounds SET is_draft=false,invites_locked_at=coalesce(invites_locked_at,now()) WHERE id=p_round;
 UPDATE round_players SET status='finished',finished_at=now() WHERE round_id=p_round AND status='joined';
 PERFORM refresh_honor_skins(p_round);
END; $$;

CREATE TABLE public.round_side_games (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
 from_player uuid NOT NULL,to_player uuid NOT NULL CHECK(from_player<>to_player),
 amount numeric(12,2) NOT NULL CHECK(amount>0 AND amount<=1000000),
 hole int NOT NULL CHECK(hole BETWEEN 1 AND 18),label text NOT NULL CHECK(length(trim(label)) BETWEEN 1 AND 60),
 edited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,edited_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(round_id,from_player) REFERENCES round_players(round_id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(round_id,to_player) REFERENCES round_players(round_id,user_id) ON DELETE CASCADE
);
ALTER TABLE round_side_games ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON round_side_games TO authenticated;
CREATE POLICY side_game_read ON round_side_games FOR SELECT TO authenticated USING(can_read_round(round_id));
CREATE FUNCTION public.save_side_game(p_round uuid,p_from uuid,p_to uuid,p_amount numeric,p_hole int,p_label text,p_id uuid DEFAULT null) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM 1 FROM rounds WHERE id=p_round FOR UPDATE;
 IF NOT can_score_group(p_round) THEN RAISE EXCEPTION 'Only this group can edit Brass.'; END IF;
 IF p_hole>(SELECT hole_count FROM rounds WHERE id=p_round) THEN RAISE EXCEPTION 'Choose a hole played in this round.';END IF;
 IF p_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM round_side_games WHERE id=p_id AND round_id=p_round) THEN RAISE EXCEPTION 'Entry not found in this round.';END IF;
 INSERT INTO round_side_games(id,round_id,from_player,to_player,amount,hole,label,edited_by) VALUES(coalesce(p_id,gen_random_uuid()),p_round,p_from,p_to,p_amount,p_hole,trim(p_label),auth.uid())
 ON CONFLICT(id) DO UPDATE SET from_player=excluded.from_player,to_player=excluded.to_player,amount=excluded.amount,hole=excluded.hole,label=excluded.label,edited_by=auth.uid(),edited_at=now() RETURNING id INTO v_id;
 RETURN v_id;
END; $$;
CREATE FUNCTION public.delete_side_game(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT EXISTS(SELECT 1 FROM round_side_games WHERE id=p_id AND can_score_group(round_id)) THEN RAISE EXCEPTION 'Only this group can delete Brass.';END IF;DELETE FROM round_side_games WHERE id=p_id;END; $$;

REVOKE ALL ON FUNCTION can_score_group(uuid),set_participant_identity(),stamp_score_editor(),add_round_player(uuid,uuid,text),refresh_honor_skins(uuid),calculate_skins_result(uuid),after_honor_score(),finish_group_round(uuid),save_side_game(uuid,uuid,uuid,numeric,int,text,uuid),delete_side_game(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION can_score_group(uuid),add_round_player(uuid,uuid,text),finish_group_round(uuid),save_side_game(uuid,uuid,uuid,numeric,int,text,uuid),delete_side_game(uuid) TO authenticated;

CREATE FUNCTION public.save_skins_game(p_round uuid,p_mode text,p_allowances jsonb,p_order int[],p_stake numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r rounds; n int; g round_games;
BEGIN
 SELECT * INTO r FROM rounds WHERE id=p_round FOR UPDATE;
 IF NOT can_score_group(p_round) THEN RAISE EXCEPTION 'Only this group can choose the game.'; END IF;
 SELECT * INTO g FROM round_games WHERE round_id=p_round FOR UPDATE;
 PERFORM invalidate_skins(p_round,false);
 SELECT count(*) INTO n FROM round_players WHERE round_id=p_round AND status IN('joined','finished');
 IF n NOT BETWEEN 2 AND 4 OR r.hole_count NOT IN (9,18) OR r.hole_count IS NULL THEN RAISE EXCEPTION 'Skins needs 2–4 joined players and 9 or 18 holes.'; END IF;
 IF p_mode IS NULL OR p_mode NOT IN ('gross','net') OR jsonb_typeof(p_allowances) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid skins rules.'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_allowances)) <> n OR EXISTS(
 SELECT 1 FROM round_players p WHERE p.round_id=p_round AND p.status IN('joined','finished') AND
 (NOT p_allowances ? p.user_id::text OR (p_allowances->>p.user_id::text) IS NULL OR (p_allowances->>p.user_id::text) !~ '^[0-9]+$')) THEN RAISE EXCEPTION 'Provide agreed strokes for every joined player.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(p_allowances) a WHERE a.value::int NOT BETWEEN 0 AND 3*r.hole_count OR (p_mode='gross' AND a.value::int<>0)) THEN RAISE EXCEPTION 'Invalid stroke allowance.'; END IF;
 IF p_order IS NULL OR cardinality(p_order) <> r.hole_count OR (SELECT count(DISTINCT h) FROM unnest(p_order) h WHERE h BETWEEN 1 AND r.hole_count) <> r.hole_count THEN RAISE EXCEPTION 'Confirm the hardest-to-easiest order of every played hole.'; END IF;
 INSERT INTO round_games(round_id,host_id,course_name,hole_count,mode,stroke_order,stake)
 VALUES(p_round,auth.uid(),(SELECT name FROM courses WHERE id=r.course_id),r.hole_count,p_mode,p_order,p_stake)
 ON CONFLICT(round_id) DO UPDATE SET mode=excluded.mode,stroke_order=excluded.stroke_order,hole_count=excluded.hole_count,stake=excluded.stake,state='setup',revision=round_games.revision+1;
 DELETE FROM round_game_players WHERE round_id=p_round;
 INSERT INTO round_game_players(round_id,user_id,strokes) SELECT p_round,user_id,(p_allowances->>user_id::text)::int FROM round_players WHERE round_id=p_round AND status IN('joined','finished');
UPDATE round_game_players SET accepted=true WHERE round_id=p_round;
 UPDATE round_games SET state=CASE WHEN r.is_draft THEN 'setup' ELSE 'active' END WHERE round_id=p_round;
 PERFORM refresh_honor_skins(p_round);
END; $$;


CREATE OR REPLACE FUNCTION public.get_skins_game(p_round uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games; players jsonb;
BEGIN
 IF NOT is_skins_member(p_round) THEN RETURN null; END IF;
 SELECT * INTO g FROM round_games WHERE round_id=p_round;
 SELECT jsonb_agg(jsonb_build_object('userId',p.user_id,'name',coalesce(pr.display_name,gp.display_name,'Former player'),'strokes',p.strokes,'accepted',p.accepted,'confirmed',p.confirmed_revision=g.revision,'finished',rp.status='finished') ORDER BY p.user_id) INTO players FROM round_game_players p LEFT JOIN profiles pr ON pr.id=p.user_id LEFT JOIN guest_players gp ON gp.id=p.user_id LEFT JOIN round_players rp ON rp.round_id=p.round_id AND rp.user_id=p.user_id WHERE p.round_id=p_round;
 RETURN to_jsonb(g)||jsonb_build_object('players',players,'result',CASE WHEN g.state IN ('settled','void') THEN g.result ELSE calculate_skins_result(p_round) END);
END; $$;

CREATE OR REPLACE FUNCTION public.get_my_brass_ledger() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(v ORDER BY v->>'created_at' DESC),'[]') FROM (
 SELECT to_jsonb(e)||jsonb_build_object('course',g.course_name,'opponent',CASE WHEN e.from_user=auth.uid() THEN e.to_user ELSE e.from_user END,'name',coalesce(p.display_name,gp.display_name,'Former player'),'change',CASE WHEN e.to_user=auth.uid() THEN e.brass ELSE -e.brass END) v
 FROM brass_entries e JOIN round_games g USING(round_id) LEFT JOIN profiles p ON p.id=CASE WHEN e.from_user=auth.uid() THEN e.to_user ELSE e.from_user END LEFT JOIN guest_players gp ON gp.id=CASE WHEN e.from_user=auth.uid() THEN e.to_user ELSE e.from_user END WHERE auth.uid() IN(e.from_user,e.to_user)
 UNION ALL
 -- A confirmed tie still belongs in the rivalry history, even without a transfer.
 SELECT jsonb_build_object('id',g.round_id::text||other.user_id::text,'round_id',g.round_id,'revision',g.revision,'opponent',other.user_id,'name',coalesce(p.display_name,gp.display_name,'Former player'),'change',0,'hole',0,'kind','award','course',g.course_name,'created_at',g.settled_at)
 FROM round_games g JOIN round_game_players me ON me.round_id=g.round_id AND me.user_id=auth.uid()
 JOIN round_game_players other ON other.round_id=g.round_id AND other.user_id<>auth.uid()
 LEFT JOIN profiles p ON p.id=other.user_id LEFT JOIN guest_players gp ON gp.id=other.user_id
 WHERE g.state='settled' AND NOT EXISTS(SELECT 1 FROM brass_entries e WHERE e.round_id=g.round_id AND e.revision=g.revision AND e.kind='award' AND ((e.from_user=auth.uid() AND e.to_user=other.user_id) OR (e.to_user=auth.uid() AND e.from_user=other.user_id)))
 UNION ALL
 SELECT jsonb_build_object('id',s.id,'round_id',s.round_id,'revision',0,'opponent',CASE WHEN s.from_player=auth.uid() THEN s.to_player ELSE s.from_player END,'name',coalesce(p.display_name,gp.display_name,'Former player'),'change',CASE WHEN s.to_player=auth.uid() THEN s.amount ELSE -s.amount END,'hole',s.hole,'kind','manual','label',s.label,'course',c.name,'created_at',s.edited_at,'editor',ep.display_name)
 FROM round_side_games s JOIN rounds r ON r.id=s.round_id JOIN courses c ON c.id=r.course_id
 LEFT JOIN profiles p ON p.id=CASE WHEN s.from_player=auth.uid() THEN s.to_player ELSE s.from_player END
 LEFT JOIN guest_players gp ON gp.id=CASE WHEN s.from_player=auth.uid() THEN s.to_player ELSE s.from_player END
 LEFT JOIN profiles ep ON ep.id=s.edited_by WHERE auth.uid() IN(s.from_player,s.to_player)
 ) history;
$$;

CREATE OR REPLACE FUNCTION public.configure_skins(p_round uuid,p_mode text,p_allowances jsonb,p_order int[]) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT save_skins_game(p_round,p_mode,p_allowances,p_order,1); $$;
REVOKE ALL ON FUNCTION save_skins_game(uuid,text,jsonb,int[],numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION save_skins_game(uuid,text,jsonb,int[],numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.skins_membership_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NEW;END IF;
 PERFORM invalidate_skins(CASE WHEN TG_OP='DELETE' THEN OLD.round_id ELSE NEW.round_id END,false);
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.after_honor_score() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid;g round_games;n int;
BEGIN
 rid:=CASE WHEN TG_OP='DELETE' THEN OLD.round_id ELSE NEW.round_id END;
 IF TG_TABLE_NAME='round_players' THEN
  SELECT * INTO g FROM round_games WHERE round_id=rid FOR UPDATE;
  IF g.round_id IS NOT NULL AND g.state<>'void' THEN
   DELETE FROM round_game_players gp WHERE gp.round_id=rid AND NOT EXISTS(SELECT 1 FROM round_players rp WHERE rp.round_id=rid AND rp.user_id=gp.user_id AND rp.status IN('joined','finished'));
   INSERT INTO round_game_players(round_id,user_id,strokes,accepted) SELECT rid,user_id,0,true FROM round_players WHERE round_id=rid AND status IN('joined','finished') ON CONFLICT DO NOTHING;
   SELECT count(*) INTO n FROM round_game_players WHERE round_id=rid;
   IF n NOT BETWEEN 2 AND 4 THEN PERFORM invalidate_skins(rid,true);END IF;
  END IF;
 END IF;
 PERFORM refresh_honor_skins(rid);RETURN null;
END; $$;
DROP TRIGGER honor_player_refresh ON round_players;
CREATE TRIGGER honor_player_refresh AFTER INSERT OR UPDATE OR DELETE ON round_players FOR EACH ROW EXECUTE FUNCTION after_honor_score();
CREATE OR REPLACE FUNCTION public.remove_or_void_skins(p_round uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games;
BEGIN
 PERFORM 1 FROM rounds WHERE id=p_round FOR UPDATE;
 SELECT * INTO g FROM round_games WHERE round_id=p_round FOR UPDATE;
 IF NOT can_score_group(p_round) THEN RAISE EXCEPTION 'Only this group can remove skins.';END IF;
 IF g.state='setup' THEN DELETE FROM round_games WHERE round_id=p_round;ELSE PERFORM invalidate_skins(p_round,true);END IF;
END; $$;
-- Honor-system UI has no individual result-confirmation workflow.
REVOKE EXECUTE ON FUNCTION public.confirm_skins(uuid,int),public.accept_skins(uuid,int) FROM authenticated;

DO $$ DECLARE g record; BEGIN FOR g IN SELECT round_id FROM round_games WHERE state='active' LOOP PERFORM refresh_honor_skins(g.round_id); END LOOP; END $$;
