-- ============================================================================
-- Helper RPC functions callable from the client
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT NOT EXISTS (
      SELECT 1 FROM profiles WHERE lower(username) = lower(check_username)
    );
  $$;

GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO authenticated;
