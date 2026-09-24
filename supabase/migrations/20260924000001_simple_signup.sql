-- Signup creates the profile in the same transaction, including when email
-- confirmation means the client does not yet have a session. Existing clients
-- without profile metadata retain the small profile-completion fallback.
ALTER TABLE public.profiles ALTER COLUMN onboarding_completed SET DEFAULT true;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon;
CREATE FUNCTION public.create_signup_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'username' AND NEW.raw_user_meta_data ? 'display_name' THEN
    INSERT INTO public.profiles(id, username, display_name, onboarding_completed)
    VALUES (NEW.id, lower(trim(NEW.raw_user_meta_data->>'username')),
      trim(NEW.raw_user_meta_data->>'display_name'), true);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_signup_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER create_profile_on_signup AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_signup_profile();
