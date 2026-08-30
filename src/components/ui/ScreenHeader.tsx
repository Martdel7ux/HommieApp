import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Avatar } from './Avatar';
import { Logo } from '@/components/Brand/Logo';

interface ScreenHeaderProps {
  /** Left-hand content. Defaults to the Hommie logo when omitted; pass `null` for an empty left slot. */
  left?: React.ReactNode;
  logoWordmark?: boolean;
  avatarUrl?: string | null;
  name?: string | null;
  hasNotifications?: boolean;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard top bar for the main tab screens. The notification bell and profile
 * avatar always sit on the right, so every screen matches.
 */
export function ScreenHeader({
  left,
  logoWordmark = true,
  avatarUrl,
  name,
  hasNotifications,
  onOpenNotifications,
  onOpenProfile,
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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
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

        <Pressable onPress={onOpenProfile} accessibilityRole="button" accessibilityLabel="Open profile">
          <Avatar uri={avatarUrl} name={name} size={40} />
        </Pressable>
      </View>
    </View>
  );
}
