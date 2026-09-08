import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

type TabName = 'index' | 'feed' | 'search' | 'profile';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        const active = state.routes[state.index]?.name as TabName | 'start' | undefined;
        return (
          <TabBar
            active={active ?? 'index'}
            // Navigating through the tab navigator preserves each tab's
            // mounted state and scroll position. The previous router.replace
            // tore the screen down and refetched on every tap.
            onSelect={(name) => navigation.navigate(name)}
          />
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="start" options={{ href: null }} />
    </Tabs>
  );
}
