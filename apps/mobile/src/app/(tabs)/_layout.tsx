import { Tabs } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { TabsBar } from '@/components/tabs-bar';

/** Main app tabs: Home, Explore, (+ quick actions), Community, Profile (§32). */
export default function TabsLayout() {
  return (
    <>
      <AnimatedSplashOverlay />
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabsBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="community" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </>
  );
}
