-- The helper is callable over RPC, so even its boolean result must respect round privacy.
CREATE OR REPLACE FUNCTION public.photo_eligible(p_round uuid,p_kind text,p_player uuid,p_hole int) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT can_read_round(p_round) AND CASE WHEN p_kind='ace' THEN EXISTS(SELECT 1 FROM round_holes WHERE round_id=p_round AND player_id=p_player AND hole_number=p_hole AND score=1)
 WHEN p_kind='group' THEN EXISTS(SELECT 1 FROM rounds r WHERE r.id=p_round AND r.is_group AND NOT r.is_draft
 AND EXISTS(SELECT 1 FROM round_players p WHERE p.round_id=r.id AND p.status='finished')
 AND NOT EXISTS(SELECT 1 FROM round_players p WHERE p.round_id=r.id AND p.status IN('joined','invited')))
 ELSE false END;
$$;
