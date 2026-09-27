ALTER TABLE public.round_photos ADD CONSTRAINT ace_photo_requires_hole CHECK(kind<>'ace' OR hole_number IS NOT NULL);
