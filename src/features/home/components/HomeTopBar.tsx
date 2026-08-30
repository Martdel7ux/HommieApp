import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Avatar } from '@/components/ui';

export function HomeTopBar({
  avatarUrl,
  name,
  hasNotifications,
  onOpenNotifications,
  onOpenProfile,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  hasNotifications?: boolean;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
}) {
  const theme = useTheme();
  return (
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
  );
}
