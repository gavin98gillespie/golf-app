-- Keep profile photo reads bounded without sending every historical round ID from the phone.
CREATE FUNCTION public.profile_round_photos(p_user uuid) RETURNS SETOF public.round_photos
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT photo.* FROM round_photos photo
 WHERE (photo.kind='ace' AND photo.player_id=p_user OR photo.kind='group')
 AND EXISTS(SELECT 1 FROM round_players p WHERE p.round_id=photo.round_id AND p.user_id=p_user AND p.status IN('joined','finished'))
 ORDER BY photo.created_at DESC LIMIT 30;
$$;
REVOKE ALL ON FUNCTION public.profile_round_photos(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.profile_round_photos(uuid) TO authenticated;
