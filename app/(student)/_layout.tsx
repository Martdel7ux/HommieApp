import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';

export default function StudentTabsLayout() {
  const theme = useTheme();
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
        {/* Jobs hidden until a job-listing partner is lined up — flip href back to reveal */}
        <Tabs.Screen name="explore" options={{ title: 'Jobs', href: null }} />
        <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
        <Tabs.Screen name="community" options={{ title: 'Community' }} />
      </Tabs>
    </View>
  );
}
