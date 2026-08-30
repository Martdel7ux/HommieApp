import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { theme } from '@/theme';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';

export default function StudentTabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // custom bar is absolutely positioned — don't reserve layout space for it
          tabBarStyle: { position: 'absolute' },
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
        <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
        <Tabs.Screen name="community" options={{ title: 'Community' }} />
        {/* Profile is opened from the avatar in each screen's header, not the tab bar. */}
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
