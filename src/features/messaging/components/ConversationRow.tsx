import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text, Avatar } from '@/components/ui';
import { inboxTime } from '@/lib/datetime';
import type { ConversationSummary } from '../types';

export function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: ConversationSummary;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { other, unread, lastMessagePreview, lastMessageAt, contextLabel } = conversation;
  const name = other?.name ?? 'Hommie user';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${name}${unread ? ', unread' : ''}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: theme.spacing.md,
        alignItems: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.radius['2xl'],
        // Unread conversations lift onto a card, like the Figma.
        backgroundColor: unread ? theme.colors.surface : 'transparent',
        ...(unread ? theme.shadows.md : {}),
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View>
        <Avatar uri={other?.avatarUrl} name={name} size={54} />
        {unread ? (
          <View
            style={{
              position: 'absolute',
              top: -1,
              right: -1,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: theme.colors.primary,
              borderWidth: 2.5,
              borderColor: unread ? theme.colors.surface : theme.colors.background,
            }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text
            variant="h3"
            numberOfLines={1}
            style={{ flex: 1, fontSize: 16, fontWeight: unread ? '700' : '600' }}
          >
            {name}
          </Text>
          <Text
            variant="caption"
            color={unread ? theme.colors.primary : theme.colors.textTertiary}
            style={{ fontWeight: unread ? '700' : '400' }}
          >
            {inboxTime(lastMessageAt)}
          </Text>
        </View>

        {contextLabel ? (
          <Text variant="caption" color={theme.colors.textTertiary} numberOfLines={1}>
            {contextLabel}
          </Text>
        ) : null}

        <Text
          variant="bodySm"
          numberOfLines={2}
          color={unread ? theme.colors.textPrimary : theme.colors.textSecondary}
          style={{ fontWeight: unread ? '500' : '400' }}
        >
          {lastMessagePreview ?? 'No messages yet'}
        </Text>
      </View>
    </Pressable>
  );
}
