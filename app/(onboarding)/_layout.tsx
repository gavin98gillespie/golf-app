import { Redirect } from 'expo-router';
/** Old onboarding links remain safe; setup is now optional inside Me. */
export default function RetiredOnboarding() {
  return <Redirect href="/(app)/(tabs)" />;
}
