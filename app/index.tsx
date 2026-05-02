import { useEffect } from 'react';
import { router } from 'expo-router';

import { useSession } from '@/lib/hooks/useSession';

export default function Index() {
  const { session, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace('/(app)/(tabs)');
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [session, loading]);

  return null;
}
