import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  explore: ['briefcase', 'briefcase-outline'],
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
      {/* hide any list content that scrolls through the strip below the pill */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', theme.colors.background, theme.colors.background]}
        locations={[0, 0.55, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: gap + RADIUS }}
      />

      {/* wrapper carries the shadow only (no clip → soft shadow all round) */}
      <View
        style={{
          borderRadius: RADIUS,
          backgroundColor: theme.colors.surface,
          shadowColor: '#0B1020',
          shadowOpacity: 0.16,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 16,
        }}
      >
        <View
          style={{
            height: PILL_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: RADIUS,
            overflow: 'hidden',
            backgroundColor: theme.colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border,
          }}
        >
          {routes.map((route) => {
            const focused = route.key === activeKey;
            const [on, off] = ICONS[route.name];
            const color = focused ? theme.colors.primary : theme.colors.textSecondary;
            const showBadge = route.name === 'messages' && unreadCount > 0;
            const label = descriptors[route.key]?.options.title ?? route.name;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
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
                    minWidth: 56,
                    paddingHorizontal: focused ? 12 : 0,
                    paddingVertical: focused ? 7 : 8,
                    borderRadius: theme.radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    backgroundColor: focused ? theme.colors.primarySubtle : 'transparent',
                  }}
                >
                  <View>
                    <Ionicons name={focused ? on : off} size={22} color={color} />
                    {showBadge ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: -2,
                          right: -5,
                          width: 9,
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: theme.colors.danger,
                          borderWidth: 1.5,
                          borderColor: focused ? theme.colors.primarySubtle : theme.colors.surface,
                        }}
                      />
                    ) : null}
                  </View>
                  {focused ? (
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}
                    >
                      {label}
                    </Text>
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
