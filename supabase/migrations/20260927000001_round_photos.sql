-- Photos are private attachments, not independent feed posts.
CREATE TABLE public.round_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
 uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('ace','group')),
 player_id uuid,
 hole_number int,
 storage_path text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 slot text GENERATED ALWAYS AS (CASE WHEN kind='group' THEN 'group' ELSE player_id::text||':'||hole_number::text END) STORED,
 UNIQUE(round_id,slot),
 FOREIGN KEY(round_id,player_id) REFERENCES public.round_players(round_id,user_id) ON DELETE CASCADE,
 CHECK((kind='group' AND player_id IS NULL AND hole_number IS NULL) OR (kind='ace' AND player_id IS NOT NULL AND hole_number BETWEEN 1 AND 18))
);
CREATE INDEX round_photos_round_idx ON public.round_photos(round_id);
CREATE INDEX round_photos_player_idx ON public.round_photos(player_id,created_at DESC);

CREATE FUNCTION public.photo_eligible(p_round uuid,p_kind text,p_player uuid,p_hole int) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN p_kind='ace' THEN EXISTS(SELECT 1 FROM round_holes WHERE round_id=p_round AND player_id=p_player AND hole_number=p_hole AND score=1)
 WHEN p_kind='group' THEN EXISTS(SELECT 1 FROM rounds r WHERE r.id=p_round AND r.is_group AND NOT r.is_draft
 AND EXISTS(SELECT 1 FROM round_players p WHERE p.round_id=r.id AND p.status='finished')
 AND NOT EXISTS(SELECT 1 FROM round_players p WHERE p.round_id=r.id AND p.status IN('joined','invited')))
 ELSE false END;
$$;
CREATE FUNCTION public.can_attach_round_photo(p_round uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (can_score_group(p_round) OR EXISTS(SELECT 1 FROM rounds WHERE id=p_round AND user_id=auth.uid()));
$$;
CREATE FUNCTION public.validate_round_photo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT can_attach_round_photo(NEW.round_id) OR NEW.uploader_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'You cannot add this photo.'; END IF;
 IF TG_OP='UPDATE' AND (NEW.round_id,NEW.kind,NEW.player_id,NEW.hole_number,NEW.uploader_id) IS DISTINCT FROM (OLD.round_id,OLD.kind,OLD.player_id,OLD.hole_number,OLD.uploader_id) THEN RAISE EXCEPTION 'Photo identity cannot change.'; END IF;
 IF NOT photo_eligible(NEW.round_id,NEW.kind,NEW.player_id,NEW.hole_number) THEN RAISE EXCEPTION 'Save a hole in one or finish the group round first.'; END IF;
 IF NEW.storage_path NOT LIKE NEW.uploader_id::text||'/'||NEW.round_id::text||'/%' OR NEW.storage_path !~ '^[0-9a-f-]+/[0-9a-f-]+/[a-z0-9-]+\.jpg$' THEN RAISE EXCEPTION 'Invalid photo path.'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_round_photo BEFORE INSERT OR UPDATE ON public.round_photos FOR EACH ROW EXECUTE FUNCTION public.validate_round_photo();
ALTER TABLE public.round_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY round_photos_read ON public.round_photos FOR SELECT TO authenticated USING(can_read_round(round_id) AND photo_eligible(round_id,kind,player_id,hole_number));
CREATE POLICY round_photos_insert ON public.round_photos FOR INSERT TO authenticated WITH CHECK(uploader_id=auth.uid() AND can_attach_round_photo(round_id));
CREATE POLICY round_photos_update ON public.round_photos FOR UPDATE TO authenticated USING(uploader_id=auth.uid() AND can_attach_round_photo(round_id)) WITH CHECK(uploader_id=auth.uid());
CREATE POLICY round_photos_delete ON public.round_photos FOR DELETE TO authenticated USING(uploader_id=auth.uid());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.round_photos TO authenticated;
REVOKE ALL ON public.round_photos FROM anon;

-- Keep removed/replaced files queued until the Storage API confirms physical deletion.
CREATE TABLE public.photo_cleanup_queue(storage_path text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.photo_cleanup_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.photo_cleanup_queue FROM anon,authenticated;
CREATE FUNCTION public.queue_photo_cleanup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.storage_path IS DISTINCT FROM NEW.storage_path THEN
 INSERT INTO photo_cleanup_queue(storage_path) VALUES(OLD.storage_path) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NULL;
END; $$;
CREATE TRIGGER queue_photo_cleanup AFTER DELETE OR UPDATE ON public.round_photos FOR EACH ROW EXECUTE FUNCTION public.queue_photo_cleanup();
CREATE FUNCTION public.remove_corrected_ace_photo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' OR NEW.score<>1 THEN DELETE FROM round_photos WHERE round_id=OLD.round_id AND player_id=OLD.player_id AND hole_number=OLD.hole_number AND kind='ace'; END IF;
 RETURN NULL;
END; $$;
CREATE TRIGGER remove_corrected_ace_photo AFTER DELETE OR UPDATE OF score ON public.round_holes FOR EACH ROW EXECUTE FUNCTION public.remove_corrected_ace_photo();
REVOKE ALL ON FUNCTION public.photo_eligible(uuid,text,uuid,int),public.can_attach_round_photo(uuid),public.validate_round_photo(),public.queue_photo_cleanup(),public.remove_corrected_ace_photo() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.photo_eligible(uuid,text,uuid,int),public.can_attach_round_photo(uuid) TO authenticated;

-- Storage exists on Supabase; the lightweight SQL test harness supplies its own schema.
DO $migration$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='storage') THEN
  INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  VALUES('round-photos','round-photos',false,5242880,ARRAY['image/jpeg']) ON CONFLICT(id) DO NOTHING;
  EXECUTE $policy$CREATE POLICY round_photo_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(
   bucket_id='round-photos' AND split_part(name,'/',1)=auth.uid()::text
   AND CASE WHEN split_part(name,'/',2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN public.can_attach_round_photo(split_part(name,'/',2)::uuid) ELSE false END
  )$policy$;
  EXECUTE $policy$CREATE POLICY round_photo_read ON storage.objects FOR SELECT TO authenticated USING(
   bucket_id='round-photos' AND EXISTS(SELECT 1 FROM public.round_photos p WHERE p.storage_path=name)
  )$policy$;
  EXECUTE $policy$CREATE POLICY round_photo_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='round-photos' AND split_part(name,'/',1)=auth.uid()::text)$policy$;
 END IF;
END $migration$;
