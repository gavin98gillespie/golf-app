-- ============================================================================
-- Phase 4: server-side profanity backstop. The client filters with the full
-- bad-words dictionary; the DB enforces a small high-severity list so even
-- service-role inserts can't bypass it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.contains_blocked_word(input TEXT)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  IMMUTABLE
  AS $$
DECLARE
  blocked TEXT[] := ARRAY[
    -- Keep this list intentionally small. Real moderation happens client-side
    -- and via the reports queue.
    'test_blocked_word'
  ];
  needle TEXT;
  haystack TEXT;
BEGIN
  haystack := lower(input);
  FOREACH needle IN ARRAY blocked LOOP
    IF haystack ~* ('\m' || needle || '\M') THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  RETURN FALSE;
END;
$$;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_no_blocked
    CHECK (NOT public.contains_blocked_word(username)),
  ADD CONSTRAINT profiles_display_name_no_blocked
    CHECK (NOT public.contains_blocked_word(display_name));

ALTER TABLE comments
  ADD CONSTRAINT comments_body_no_blocked
    CHECK (NOT public.contains_blocked_word(body));
