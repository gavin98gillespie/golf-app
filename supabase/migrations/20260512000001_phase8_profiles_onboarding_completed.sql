-- supabase/migrations/20260512000001_phase8_profiles_onboarding_completed.sql
ALTER TABLE profiles
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Backfill: anyone with username + display_name has effectively finished
-- the equivalent of onboarding (Phase 1 profile-setup), so we don't force
-- them through the new Phase 8 flow.
UPDATE profiles
SET onboarding_completed = true
WHERE username IS NOT NULL AND display_name IS NOT NULL;
