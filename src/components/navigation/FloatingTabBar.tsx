import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useUnreadConversationCount } from '@/features/messaging/hooks';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Minimal shape of the props react-navigation hands a custom `tabBar`. */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
  };
  descriptors: Record<string, { options: { title?: string } }>;
}

const ICONS: Record<string, [IoniconName, IoniconName]> = {
  home: ['home', 'home-outline'],
  explore: ['search', 'search-outline'],
  messages: ['chatbubble', 'chatbubble-outline'],
  community: ['people', 'people-outline'],
};

const PILL_HEIGHT = 62;
const RADIUS = PILL_HEIGHT / 2;

export function FloatingTabBar({ state, navigation, descriptors }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const unread = useUnreadConversationCount();
  const unreadCount = unread.data ?? 0;

  const routes = state.routes.filter((r) => ICONS[r.name]);
  const activeKey = state.routes[state.index]?.key;
  const gap = Math.max(insets.bottom - 6, 14);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: theme.layout.tabBarInset,
        paddingBottom: gap,
      }}
    >
      {/* fade any list content that scrolls through the strip below the pill */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', theme.colors.background]}
        locations={[0, 0.75]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: gap + 14 }}
      />
      {/* wrapper carries the shadow only (no clip, so the shadow is soft all round) */}
      <View
        style={{
          borderRadius: RADIUS,
          shadowColor: '#0B1020',
          shadowOpacity: 0.22,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 10 },
          elevation: 18,
        }}
      >
        <BlurView
          tint="light"
          intensity={Platform.OS === 'android' ? 0 : 70}
          style={{
            height: PILL_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: RADIUS,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(255,255,255,0.45)',
            backgroundColor:
              Platform.OS === 'android' ? theme.colors.surface : 'rgba(255,255,255,0.32)',
          }}
        >
          {routes.map((route) => {
            const focused = route.key === activeKey;
            const [on, off] = ICONS[route.name];
            const color = focused ? theme.colors.primary : theme.colors.textSecondary;
            const showBadge = route.name === 'messages' && unreadCount > 0;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={descriptors[route.key]?.options.title ?? route.name}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 56,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: focused ? theme.colors.primarySubtle : 'transparent',
                  }}
                >
                  <Ionicons name={focused ? on : off} size={22} color={color} />
                  {showBadge ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 12,
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
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}
