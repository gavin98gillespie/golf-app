import { Redirect } from 'expo-router';

import { useSession } from '@/lib/hooks/useSession';

export default function Index() {
  const { session } = useSession();

  // The root layout holds the splash until the session resolves, so by the
  // time this renders we already know which way to send the user. Redirecting
  // declaratively avoids the double-navigation flicker of a router.replace
  // fired from an effect.
  return <Redirect href={session ? '/(app)/(tabs)' : '/(auth)/welcome'} />;
}
