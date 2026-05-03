-- Phase 5: identity + photo extension points on courses.
-- osm_id is the OpenStreetMap way/relation id (BIGINT). Used to dedup the
-- bulk seed. cover_image_url is reserved for a future photo extension —
-- currently unused but kept to avoid another migration later.

ALTER TABLE courses
  ADD COLUMN osm_id BIGINT,
  ADD COLUMN cover_image_url TEXT;

CREATE UNIQUE INDEX courses_osm_id_unique ON courses(osm_id) WHERE osm_id IS NOT NULL;
