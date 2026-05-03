-- Replace the partial unique index with a regular UNIQUE constraint so
-- ON CONFLICT (osm_id) works in upserts. UNIQUE constraints allow multiple
-- NULL values per SQL standard, so non-OSM courses (with NULL osm_id) are
-- still fine.

DROP INDEX IF EXISTS courses_osm_id_unique;

ALTER TABLE courses
  ADD CONSTRAINT courses_osm_id_key UNIQUE (osm_id);
