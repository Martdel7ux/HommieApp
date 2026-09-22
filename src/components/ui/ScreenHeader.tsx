import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Logo } from '@/components/Brand/Logo';

interface ScreenHeaderProps {
  /** Left-hand content. Defaults to the Hommie logo when omitted; pass `null` for an empty left slot. */
  left?: React.ReactNode;
  logoWordmark?: boolean;
  hasNotifications?: boolean;
  onOpenNotifications: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard top bar for the main tab screens. The notification bell sits on
 * the right, so every screen matches. Profile now lives in the bottom tab
 * bar instead of an avatar here.
 */
export function ScreenHeader({
  left,
  logoWordmark = true,
  hasNotifications,
  onOpenNotifications,
  style,
}: ScreenHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
        style,
      ]}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {left === undefined ? <Logo size={26} withWordmark={logoWordmark} /> : left}
      </View>

      <Pressable
        onPress={onOpenNotifications}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={hasNotifications ? 'Notifications, unread' : 'Notifications'}
        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
        {hasNotifications ? (
          <View
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: theme.colors.danger,
              borderWidth: 1.5,
              borderColor: theme.colors.background,
            }}
          />
        ) : null}
      </Pressable>
    </View>
  );
}
