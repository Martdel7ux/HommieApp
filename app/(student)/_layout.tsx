import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useUnreadConversationCount } from '@/features/messaging/hooks';

type IoniconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  focused,
  color,
  badge,
}: {
  name: IoniconName;
  focused: boolean;
  color: ColorValue;
  badge?: number;
}) {
  return (
    <View
      style={{
        width: 58,
        height: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? theme.colors.primarySubtle : 'transparent',
      }}
    >
      <Ionicons name={name} size={21} color={color} />
      {badge && badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 11,
            width: 9,
            height: 9,
            borderRadius: 5,
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
  const unread = useUnreadConversationCount();
  const unreadCount = unread.data ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
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
              badge={unreadCount}
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
      {/* Profile is opened from the avatar in each screen's header, not the tab bar. */}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
