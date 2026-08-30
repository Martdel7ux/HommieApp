import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';

type IoniconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  focused,
  color,
  dot,
}: {
  name: IoniconName;
  focused: boolean;
  color: ColorValue;
  dot?: boolean;
}) {
  return (
    <View
      style={{
        width: 56,
        height: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? theme.colors.primarySubtle : 'transparent',
      }}
    >
      <Ionicons name={name} size={22} color={color} />
      {dot ? (
        <View
          style={{
            position: 'absolute',
            top: 3,
            right: 12,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.danger,
            borderWidth: 1.5,
            borderColor: theme.colors.surface,
          }}
        />
      ) : null}
    </View>
  );
}

export default function StudentTabsLayout() {
  const unread = useUnreadNotificationCount();
  const hasUnread = (unread.data ?? 0) > 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: theme.layout.tabBarHeight + 26,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              focused={focused}
              color={color}
              dot={hasUnread}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} color={color} />
          ),
        }}
      />
      {/* Profile is reached from the Home avatar, not the tab bar. */}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
