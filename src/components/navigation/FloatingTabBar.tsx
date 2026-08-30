import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
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

const PILL_HEIGHT = 60;

export function FloatingTabBar({ state, navigation, descriptors }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const unread = useUnreadConversationCount();
  const unreadCount = unread.data ?? 0;

  const routes = state.routes.filter((r) => ICONS[r.name]);
  const activeKey = state.routes[state.index]?.key;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: theme.layout.tabBarInset,
        paddingBottom: Math.max(insets.bottom, 16),
        // same colour as the page: invisible against it, but hides list content
        // scrolling through the gutters and the strip below the pill
        backgroundColor: theme.colors.background,
      }}
    >
      {/* outer wrapper carries the shadow (no clipping) */}
      <View style={{ borderRadius: PILL_HEIGHT / 2, ...theme.shadows.lg }}>
        {/* inner clips the blur to the pill shape */}
        <View
          style={{
            height: PILL_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: PILL_HEIGHT / 2,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(255,255,255,0.6)',
          }}
        >
          <BlurView
            tint="light"
            intensity={Platform.OS === 'android' ? 0 : 60}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: Platform.OS === 'android' ? theme.colors.surface : 'rgba(255,255,255,0.55)' },
            ]}
          />

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
        </View>
      </View>
    </View>
  );
}
