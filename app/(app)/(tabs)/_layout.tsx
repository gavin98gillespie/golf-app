import { Tabs } from 'expo-router';

import { useSession } from '@/lib/hooks/useSession';
import { useNewFollowersCount } from '@/lib/queries/newFollowers';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { session } = useSession();
  const newFollowersQ = useNewFollowersCount(session?.user.id);
  const showDot = (newFollowersQ.data ?? 0) > 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.surface,
          borderTopColor: colors.border.subtle,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text.secondary,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="start" options={{ title: '+ Round' }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          ...(showDot ? { tabBarBadge: '•' } : {}),
          tabBarBadgeStyle: { backgroundColor: '#4ade80', color: '#08100c' },
        }}
      />
    </Tabs>
  );
}
