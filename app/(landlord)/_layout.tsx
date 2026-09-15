import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';

export default function LandlordTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: theme.layout.tabBarHeight + 24,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="listings"
        options={{ title: 'Listings', tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" color={color} size={size} /> }}
      />
      {/* Reachable from the avatar in the top bar, not a tab. */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      {/* Reachable from the dashboard's Enquiries tile, not a tab. */}
      <Tabs.Screen name="leads" options={{ href: null }} />
    </Tabs>
  );
}
