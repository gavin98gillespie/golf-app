import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        const route = props.state.routes[props.state.index];
        const name = route?.name as 'index' | 'discover' | 'profile' | 'settings' | undefined;
        return <TabBar active={name ?? 'index'} />;
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="start" options={{ href: null }} />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
