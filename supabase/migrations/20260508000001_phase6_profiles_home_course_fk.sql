ALTER TABLE profiles
  ADD CONSTRAINT profiles_home_course_id_fkey
  FOREIGN KEY (home_course_id) REFERENCES courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_home_course_id_idx ON profiles(home_course_id);
