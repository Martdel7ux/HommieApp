import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { BottomScrim } from '@/components/ui';
import { useUnreadConversationCount } from '@/features/messaging/hooks';

type IoniconName = keyof typeof Ionicons.glyphMap;

const PILL = theme.layout.tabBarPillHeight;

/** Frosted-glass background for the floating pill tab bar. */
function GlassTabBarBackground() {
  return (
    <View style={{ flex: 1, borderRadius: PILL / 2, ...theme.shadows.lg }}>
      <View
        style={{
          flex: 1,
          borderRadius: PILL / 2,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.6)',
        }}
      >
        <BlurView tint="light" intensity={48} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.44)' }]} />
      </View>
    </View>
  );
}

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
        width: 52,
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
            right: 8,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: theme.colors.danger,
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
          }}
        />
      ) : null}
    </View>
  );
}

export default function StudentTabsLayout() {
  const insets = useSafeAreaInsets();
  const unread = useUnreadConversationCount();
  const unreadCount = unread.data ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarShowLabel: false,
          tabBarBackground: GlassTabBarBackground,
          tabBarItemStyle: { height: PILL, paddingVertical: 0 },
          tabBarStyle: {
            position: 'absolute',
            left: theme.layout.tabBarInset,
            right: theme.layout.tabBarInset,
            bottom: Math.max(insets.bottom, 12),
            height: PILL,
            borderRadius: PILL / 2,
            borderTopWidth: 0,
            backgroundColor: 'transparent',
            ...theme.shadows.lg,
          },
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

      <BottomScrim />
    </View>
  );
}
