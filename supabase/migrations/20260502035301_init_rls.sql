-- ============================================================================
-- Phase 1 RLS policies. Phase 3 will expand for mutuals/public visibility.
-- ============================================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- courses + course_holes
ALTER TABLE courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_holes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_read_authenticated"
  ON courses FOR SELECT TO authenticated USING (true);

CREATE POLICY "course_holes_read_authenticated"
  ON course_holes FOR SELECT TO authenticated USING (true);

CREATE POLICY "courses_insert_authenticated"
  ON courses FOR INSERT TO authenticated
  WITH CHECK (source = 'user' AND added_by = auth.uid());

CREATE POLICY "course_holes_insert_authenticated"
  ON course_holes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_holes.course_id AND c.verified = false
    )
  );

CREATE POLICY "course_holes_update_authenticated"
  ON course_holes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_holes.course_id AND c.verified = false
    )
  );

-- rounds + round_holes (Phase 1: owner-only)
ALTER TABLE rounds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_holes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rounds_read_own"
  ON rounds FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "rounds_insert_own"
  ON rounds FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "rounds_update_own"
  ON rounds FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "rounds_delete_own"
  ON rounds FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "round_holes_read_via_round"
  ON round_holes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_holes.round_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "round_holes_write_via_round"
  ON round_holes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_holes.round_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_holes.round_id AND r.user_id = auth.uid()
    )
  );
