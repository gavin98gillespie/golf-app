import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/lib/hooks/useSession';
import { useMyProfile } from '@/lib/queries/profile';

export default function AppLayout() {
  const { session, loading: sessionLoading } = useSession();
  const profileQ = useMyProfile(session?.user.id);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      router.replace('/(auth)/welcome');
      return;
    }
    if (!profileQ.isLoading && !profileQ.data) {
      router.replace('/(auth)/profile-setup');
    }
  }, [session, sessionLoading, profileQ.isLoading, profileQ.data]);

  if (sessionLoading || profileQ.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base">
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
