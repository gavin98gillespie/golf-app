-- Brass is a non-monetary, peer-to-peer result. Only server calculations can post it.
-- Deliberately no FK to profiles/rounds: audit history survives account deletion.
CREATE TABLE public.round_games (
  round_id uuid PRIMARY KEY,
  host_id uuid NOT NULL,
  course_name text NOT NULL,
  hole_count int NOT NULL CHECK (hole_count IN (9,18)),
  mode text NOT NULL CHECK (mode IN ('gross','net')),
  stroke_order int[] NOT NULL,
  state text NOT NULL DEFAULT 'setup' CHECK (state IN ('setup','active','settled','void')),
  revision int NOT NULL DEFAULT 1,
  result jsonb,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.round_game_players (
  round_id uuid REFERENCES public.round_games ON DELETE CASCADE,
  user_id uuid NOT NULL,
  strokes int NOT NULL CHECK (strokes BETWEEN 0 AND 54),
  accepted boolean NOT NULL DEFAULT false,
  confirmed_revision int,
  PRIMARY KEY(round_id,user_id)
);
CREATE TABLE public.brass_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.round_games,
  revision int NOT NULL,
  award_key text NOT NULL,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL CHECK (to_user <> from_user),
  brass int NOT NULL CHECK (brass > 0),
  hole int NOT NULL,
  kind text NOT NULL CHECK (kind IN ('award','reversal')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id,revision,award_key,kind)
);
CREATE INDEX brass_from ON public.brass_entries(from_user,created_at);
CREATE INDEX brass_to ON public.brass_entries(to_user,created_at);
ALTER TABLE public.round_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brass_entries ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.is_skins_member(p_round uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM round_game_players WHERE round_id=p_round AND user_id=auth.uid());
$$;
CREATE POLICY game_read ON public.round_games FOR SELECT TO authenticated USING (is_skins_member(round_id));
CREATE POLICY game_players_read ON public.round_game_players FOR SELECT TO authenticated USING (is_skins_member(round_id));
CREATE POLICY brass_read ON public.brass_entries FOR SELECT TO authenticated USING (auth.uid() IN (from_user,to_user));
REVOKE ALL ON public.round_games,public.round_game_players,public.brass_entries FROM anon,authenticated;
GRANT SELECT ON public.round_games,public.round_game_players,public.brass_entries TO authenticated;

CREATE FUNCTION public.configure_skins(p_round uuid,p_mode text,p_allowances jsonb,p_order int[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r rounds; n int; g round_games;
BEGIN
 SELECT * INTO r FROM rounds WHERE id=p_round FOR UPDATE;
 IF auth.uid() IS NULL OR r.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the host can choose the game.'; END IF;
 SELECT * INTO g FROM round_games WHERE round_id=p_round FOR UPDATE;
 IF NOT r.is_group OR NOT r.is_draft OR r.invites_locked_at IS NOT NULL OR (g.state IS NOT NULL AND g.state <> 'setup') OR EXISTS(SELECT 1 FROM round_holes WHERE round_id=p_round) THEN RAISE EXCEPTION 'Choose the game before starting or recording scores.'; END IF;
 SELECT count(*) INTO n FROM round_players WHERE round_id=p_round AND status='joined';
 IF n NOT BETWEEN 2 AND 4 OR r.hole_count NOT IN (9,18) OR r.hole_count IS NULL THEN RAISE EXCEPTION 'Skins needs 2–4 joined players and 9 or 18 holes.'; END IF;
 IF p_mode IS NULL OR p_mode NOT IN ('gross','net') OR jsonb_typeof(p_allowances) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid skins rules.'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_allowances)) <> n OR EXISTS(
 SELECT 1 FROM round_players p WHERE p.round_id=p_round AND p.status='joined' AND
 (NOT p_allowances ? p.user_id::text OR (p_allowances->>p.user_id::text) IS NULL OR (p_allowances->>p.user_id::text) !~ '^[0-9]+$')) THEN RAISE EXCEPTION 'Provide agreed strokes for every joined player.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(p_allowances) a WHERE a.value::int NOT BETWEEN 0 AND 3*r.hole_count OR (p_mode='gross' AND a.value::int<>0)) THEN RAISE EXCEPTION 'Invalid stroke allowance.'; END IF;
 IF p_order IS NULL OR cardinality(p_order) <> r.hole_count OR (SELECT count(DISTINCT h) FROM unnest(p_order) h WHERE h BETWEEN 1 AND r.hole_count) <> r.hole_count THEN RAISE EXCEPTION 'Confirm the hardest-to-easiest order of every played hole.'; END IF;
 INSERT INTO round_games(round_id,host_id,course_name,hole_count,mode,stroke_order)
 VALUES(p_round,auth.uid(),(SELECT name FROM courses WHERE id=r.course_id),r.hole_count,p_mode,p_order)
 ON CONFLICT(round_id) DO UPDATE SET mode=excluded.mode,stroke_order=excluded.stroke_order,hole_count=excluded.hole_count,revision=round_games.revision+1;
 DELETE FROM round_game_players WHERE round_id=p_round;
 INSERT INTO round_game_players(round_id,user_id,strokes) SELECT p_round,user_id,(p_allowances->>user_id::text)::int FROM round_players WHERE round_id=p_round AND status='joined';
END; $$;

CREATE FUNCTION public.accept_skins(p_round uuid,p_revision int) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games;
BEGIN
 SELECT * INTO g FROM round_games WHERE round_id=p_round FOR UPDATE;
 IF NOT is_skins_member(p_round) OR g.state<>'setup' OR g.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Rules changed. Review the game again.'; END IF;
 UPDATE round_game_players SET accepted=true WHERE round_id=p_round AND user_id=auth.uid();
END; $$;

-- Internal deterministic calculator, using only authoritative score rows.
CREATE FUNCTION public.calculate_skins_result(p_round uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games; h int; carry int:=0; resolved int:=0; waiting boolean:=false;
 scores jsonb; holes jsonb:='[]'; transfers jsonb:='[]'; balances jsonb:='{}';
 n int; low int; winner uuid; ties int; v_player record;
BEGIN
 SELECT * INTO g FROM round_games WHERE round_id=p_round;
 SELECT count(*) INTO n FROM round_game_players WHERE round_id=p_round;
 FOR v_player IN SELECT user_id FROM round_game_players WHERE round_id=p_round ORDER BY user_id LOOP balances:=balances||jsonb_build_object(v_player.user_id::text,0); END LOOP;
 FOR h IN 1..g.hole_count LOOP
  SELECT coalesce(jsonb_agg(jsonb_build_object('playerId',user_id,'gross',score,'strokesReceived',received,'net',score-received) ORDER BY user_id),'[]') INTO scores
  FROM (SELECT p.user_id,rh.score,CASE WHEN g.mode='gross' THEN 0 ELSE p.strokes/g.hole_count + CASE WHEN array_position(g.stroke_order,h)<=p.strokes%g.hole_count THEN 1 ELSE 0 END END received
   FROM round_game_players p JOIN round_holes rh ON rh.round_id=p.round_id AND rh.player_id=p.user_id AND rh.hole_number=h WHERE p.round_id=p_round) s;
  IF waiting OR jsonb_array_length(scores)<>n THEN
   waiting:=true; holes:=holes||jsonb_build_array(jsonb_build_object('hole',h,'state','waiting','skinsAtStake',null,'winnerId',null,'scores',scores)); CONTINUE;
  END IF;
  resolved:=resolved+1; carry:=carry+1;
  SELECT min((v->>'net')::int) INTO low FROM jsonb_array_elements(scores) v;
  SELECT count(*),min(v->>'playerId')::uuid INTO ties,winner FROM jsonb_array_elements(scores) v WHERE (v->>'net')::int=low;
  IF ties<>1 THEN winner:=null; END IF;
  holes:=holes||jsonb_build_array(jsonb_build_object('hole',h,'state',CASE WHEN winner IS NULL THEN 'carried' ELSE 'won' END,'skinsAtStake',carry,'winnerId',winner,'scores',scores));
  IF winner IS NOT NULL THEN
   FOR v_player IN SELECT user_id FROM round_game_players WHERE round_id=p_round AND user_id<>winner ORDER BY user_id LOOP
    transfers:=transfers||jsonb_build_array(jsonb_build_object('awardKey',jsonb_build_array('skins-v1',h,v_player.user_id,winner)::text,'from',v_player.user_id,'to',winner,'brass',carry,'hole',h));
    balances:=jsonb_set(balances,ARRAY[v_player.user_id::text],to_jsonb((balances->>v_player.user_id::text)::int-carry));
    balances:=jsonb_set(balances,ARRAY[winner::text],to_jsonb((balances->>winner::text)::int+carry));
   END LOOP;
   carry:=0;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('engineVersion','skins-v1','holes',holes,'transfers',transfers,'balances',balances,'resolvedHoles',resolved,'allScoresPresent',resolved=g.hole_count,'carryover',CASE WHEN waiting THEN carry ELSE 0 END,'unawardedSkins',CASE WHEN waiting THEN 0 ELSE carry END);
END; $$;

CREATE FUNCTION public.invalidate_skins(p_round uuid,p_void boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games;
BEGIN
 SELECT * INTO g FROM round_games WHERE round_id=p_round FOR UPDATE;
 IF g.round_id IS NULL OR g.state='void' THEN RETURN; END IF;
 IF g.state='settled' THEN
  INSERT INTO brass_entries(round_id,revision,award_key,from_user,to_user,brass,hole,kind)
   SELECT round_id,revision,award_key,to_user,from_user,brass,hole,'reversal' FROM brass_entries WHERE round_id=p_round AND revision=g.revision AND kind='award' ON CONFLICT DO NOTHING;
 END IF;
 UPDATE round_games SET revision=revision+1,state=CASE WHEN p_void THEN 'void' WHEN state='settled' THEN 'active' ELSE state END WHERE round_id=p_round;
 UPDATE round_game_players SET confirmed_revision=null,accepted=CASE WHEN g.state='setup' THEN false ELSE accepted END WHERE round_id=p_round;
END; $$;

CREATE FUNCTION public.skins_score_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid; pid uuid; g round_games;
BEGIN
 IF TG_OP='UPDATE' AND NEW.score=OLD.score AND NEW.hole_number=OLD.hole_number AND NEW.player_id=OLD.player_id AND NEW.round_id=OLD.round_id THEN RETURN NEW; END IF;
 IF TG_OP='DELETE' THEN rid:=OLD.round_id;pid:=OLD.player_id; ELSE rid:=NEW.round_id;pid:=NEW.player_id; END IF;
 SELECT * INTO g FROM round_games WHERE round_id=rid FOR UPDATE;
 IF EXISTS(SELECT 1 FROM round_game_players WHERE round_id=rid AND user_id=pid) AND g.state<>'void' THEN
  IF g.state='setup' AND TG_OP<>'DELETE' THEN RAISE EXCEPTION 'Everyone must agree to skins and the host must start first.'; END IF;
  PERFORM invalidate_skins(rid,TG_OP='DELETE');
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
CREATE TRIGGER skins_score_change BEFORE INSERT OR UPDATE OR DELETE ON round_holes FOR EACH ROW EXECUTE FUNCTION skins_score_changed();

CREATE FUNCTION public.skins_membership_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid; pid uuid; g round_games;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF TG_OP='DELETE' THEN rid:=OLD.round_id;pid:=OLD.user_id; ELSE rid:=NEW.round_id;pid:=NEW.user_id; END IF;
 SELECT * INTO g FROM round_games WHERE round_id=rid FOR UPDATE;
 IF g.state='setup' THEN PERFORM invalidate_skins(rid,false);
 ELSIF EXISTS(SELECT 1 FROM round_game_players WHERE round_id=rid AND user_id=pid) THEN
  PERFORM invalidate_skins(rid,CASE WHEN TG_OP='DELETE' THEN true ELSE NEW.status='withdrawn' END);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
CREATE TRIGGER skins_membership_change BEFORE INSERT OR UPDATE OR DELETE ON round_players FOR EACH ROW EXECUTE FUNCTION skins_membership_changed();

CREATE FUNCTION public.skins_round_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games;
BEGIN
 SELECT * INTO g FROM round_games WHERE round_id=OLD.id FOR UPDATE;
 IF g.round_id IS NULL OR g.state='void' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' THEN PERFORM invalidate_skins(OLD.id,true); RETURN OLD; END IF;
 IF NEW.course_id IS DISTINCT FROM OLD.course_id OR NEW.hole_count IS DISTINCT FROM OLD.hole_count OR NEW.is_group IS DISTINCT FROM OLD.is_group THEN RAISE EXCEPTION 'Remove or void skins before changing the course or holes.'; END IF;
 IF g.state='setup' AND (NEW.invites_locked_at IS NOT NULL OR NOT NEW.is_draft) THEN
  IF EXISTS(SELECT 1 FROM round_game_players WHERE round_id=OLD.id AND NOT accepted)
   OR EXISTS((SELECT user_id FROM round_game_players WHERE round_id=OLD.id EXCEPT SELECT user_id FROM round_players WHERE round_id=OLD.id AND status='joined') UNION ALL (SELECT user_id FROM round_players WHERE round_id=OLD.id AND status='joined' EXCEPT SELECT user_id FROM round_game_players WHERE round_id=OLD.id)) THEN
   RAISE EXCEPTION 'Every joined player must agree to the current skins rules. If players changed, save the rules again.';
  END IF;
  UPDATE round_games SET state='active' WHERE round_id=OLD.id;
 ELSIF g.state IN ('active','settled') AND (NEW.invites_locked_at IS NULL OR NEW.is_draft) THEN RAISE EXCEPTION 'A skins round cannot return to the lobby.';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER skins_round_change BEFORE UPDATE OR DELETE ON rounds FOR EACH ROW EXECUTE FUNCTION skins_round_changed();

CREATE FUNCTION public.confirm_skins(p_round uuid,p_revision int) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games; v_result jsonb;
BEGIN
 SELECT * INTO g FROM round_games WHERE round_id=p_round FOR UPDATE;
 IF NOT is_skins_member(p_round) OR g.state NOT IN ('active','settled') OR g.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'The result changed. Review it again before confirming.'; END IF;
 IF g.state='settled' THEN RETURN; END IF;
 v_result:=calculate_skins_result(p_round);
 IF NOT (v_result->>'allScoresPresent')::boolean OR EXISTS(SELECT 1 FROM round_game_players p LEFT JOIN round_players rp ON rp.round_id=p.round_id AND rp.user_id=p.user_id WHERE p.round_id=p_round AND rp.status IS DISTINCT FROM 'finished') THEN RAISE EXCEPTION 'Every player must finish every hole before confirming.'; END IF;
 UPDATE round_game_players SET confirmed_revision=p_revision WHERE round_id=p_round AND user_id=auth.uid();
 IF NOT EXISTS(SELECT 1 FROM round_game_players WHERE round_id=p_round AND confirmed_revision IS DISTINCT FROM p_revision) THEN
  INSERT INTO brass_entries(round_id,revision,award_key,from_user,to_user,brass,hole,kind)
  SELECT p_round,p_revision,v->>'awardKey',(v->>'from')::uuid,(v->>'to')::uuid,(v->>'brass')::int,(v->>'hole')::int,'award' FROM jsonb_array_elements(v_result->'transfers') v;
  UPDATE round_games SET state='settled',result=v_result,settled_at=now() WHERE round_id=p_round;
 END IF;
END; $$;

CREATE FUNCTION public.remove_or_void_skins(p_round uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games;
BEGIN
 -- Same lock order as configuration/start.
 PERFORM 1 FROM rounds WHERE id=p_round FOR UPDATE;
 SELECT * INTO g FROM round_games WHERE round_id=p_round FOR UPDATE;
 IF NOT is_skins_member(p_round) THEN RAISE EXCEPTION 'Only game participants can do this.'; END IF;
 IF g.state='setup' THEN
  IF g.host_id<>auth.uid() THEN RAISE EXCEPTION 'Only the host can remove the game.'; END IF;
  DELETE FROM round_games WHERE round_id=p_round;
 ELSE PERFORM invalidate_skins(p_round,true); END IF;
END; $$;

CREATE FUNCTION public.get_skins_game(p_round uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE g round_games; players jsonb;
BEGIN
 IF NOT is_skins_member(p_round) THEN RETURN null; END IF;
 SELECT * INTO g FROM round_games WHERE round_id=p_round;
 SELECT jsonb_agg(jsonb_build_object('userId',p.user_id,'name',coalesce(pr.display_name,'Former player'),'strokes',p.strokes,'accepted',p.accepted,'confirmed',p.confirmed_revision=g.revision,'finished',rp.status='finished') ORDER BY p.user_id) INTO players FROM round_game_players p LEFT JOIN profiles pr ON pr.id=p.user_id LEFT JOIN round_players rp ON rp.round_id=p.round_id AND rp.user_id=p.user_id WHERE p.round_id=p_round;
 RETURN to_jsonb(g)||jsonb_build_object('players',players,'result',CASE WHEN g.state IN ('settled','void') THEN g.result ELSE calculate_skins_result(p_round) END);
END; $$;
CREATE FUNCTION public.get_my_brass_ledger() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(v ORDER BY v->>'created_at' DESC),'[]') FROM (
 SELECT to_jsonb(e)||jsonb_build_object('course',g.course_name,'opponent',CASE WHEN e.from_user=auth.uid() THEN e.to_user ELSE e.from_user END,'name',coalesce(p.display_name,'Former player'),'change',CASE WHEN e.to_user=auth.uid() THEN e.brass ELSE -e.brass END) v
 FROM brass_entries e JOIN round_games g USING(round_id) LEFT JOIN profiles p ON p.id=CASE WHEN e.from_user=auth.uid() THEN e.to_user ELSE e.from_user END WHERE auth.uid() IN(e.from_user,e.to_user)
 UNION ALL
 -- A confirmed tie still belongs in the rivalry history, even without a transfer.
 SELECT jsonb_build_object('id',g.round_id::text||other.user_id::text,'round_id',g.round_id,'revision',g.revision,'opponent',other.user_id,'name',coalesce(p.display_name,'Former player'),'change',0,'hole',0,'kind','award','course',g.course_name,'created_at',g.settled_at)
 FROM round_games g JOIN round_game_players me ON me.round_id=g.round_id AND me.user_id=auth.uid()
 JOIN round_game_players other ON other.round_id=g.round_id AND other.user_id<>auth.uid()
 LEFT JOIN profiles p ON p.id=other.user_id
 WHERE g.state='settled' AND NOT EXISTS(SELECT 1 FROM brass_entries e WHERE e.round_id=g.round_id AND e.revision=g.revision AND e.kind='award' AND ((e.from_user=auth.uid() AND e.to_user=other.user_id) OR (e.to_user=auth.uid() AND e.from_user=other.user_id)))
 ) history;
$$;
-- Public execute is PostgreSQL's default: explicitly close all internal functions.
REVOKE ALL ON FUNCTION public.is_skins_member(uuid),public.configure_skins(uuid,text,jsonb,int[]),public.accept_skins(uuid,int),public.calculate_skins_result(uuid),public.invalidate_skins(uuid,boolean),public.skins_score_changed(),public.skins_membership_changed(),public.skins_round_changed(),public.confirm_skins(uuid,int),public.remove_or_void_skins(uuid),public.get_skins_game(uuid),public.get_my_brass_ledger() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_skins_member(uuid),public.configure_skins(uuid,text,jsonb,int[]),public.accept_skins(uuid,int),public.confirm_skins(uuid,int),public.remove_or_void_skins(uuid),public.get_skins_game(uuid),public.get_my_brass_ledger() TO authenticated;
