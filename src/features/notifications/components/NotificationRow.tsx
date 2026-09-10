import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { timeAgo } from '@/lib/datetime';
import type { AppNotification } from '../api';
import type { NotificationType } from '@/types/database';

type IconName = keyof typeof Ionicons.glyphMap;

function visualFor(theme: ReturnType<typeof useTheme>, type: NotificationType) {
  const map: Record<NotificationType, { icon: IconName; bg: string; fg: string }> = {
    message: { icon: 'chatbubble-ellipses', bg: theme.colors.primarySubtle, fg: theme.colors.primary },
    enquiry: { icon: 'mail', bg: theme.colors.accentSubtle, fg: theme.colors.accent },
    event_reminder: { icon: 'calendar', bg: theme.colors.tileEventsBg, fg: theme.colors.tileEventsInk },
    community_reply: { icon: 'chatbubbles', bg: theme.colors.infoSubtle, fg: theme.colors.info },
    community_like: { icon: 'heart', bg: theme.colors.dangerSubtle, fg: theme.colors.danger },
    listing_saved: { icon: 'bookmark', bg: theme.colors.primarySubtle, fg: theme.colors.primary },
    roommate_saved: { icon: 'people', bg: theme.colors.primarySubtle, fg: theme.colors.primary },
    system: { icon: 'sparkles', bg: theme.colors.surfaceSunken, fg: theme.colors.textSecondary },
  };
  return map[type];
}

export function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const theme = useTheme();
  const v = visualFor(theme, notification.type);
  const unread = !notification.isRead;
  // System / announcement notices (e.g. "Welcome to Hommie") read as plain text.
  const showIcon = notification.type !== 'system';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.body ?? ''}${unread ? '. Unread' : ''}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.xl,
        backgroundColor: unread ? theme.colors.surface : 'transparent',
        borderWidth: 1,
        borderColor: unread ? theme.colors.border : 'transparent',
        opacity: pressed ? 0.96 : 1,
        ...(unread ? theme.shadows.sm : {}),
      })}
    >
      {showIcon ? (
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: v.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={v.icon} size={19} color={v.fg} />
        </View>
      ) : null}

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="h3" numberOfLines={1} style={{ flex: 1, fontSize: 15 }}>
            {notification.title}
          </Text>
          <Text variant="caption" muted>
            {timeAgo(notification.createdAt)}
          </Text>
        </View>
        {notification.body ? (
          <Text variant="bodySm" muted numberOfLines={2}>
            {notification.body}
          </Text>
        ) : null}
      </View>

      {unread ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.primary,
            marginTop: 6,
          }}
        />
      ) : null}
    </Pressable>
  );
}
