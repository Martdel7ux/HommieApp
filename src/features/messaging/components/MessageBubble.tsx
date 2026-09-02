import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { messageTime } from '@/lib/datetime';
import type { ChatMessage } from '../types';

export function MessageBubble({
  message,
  mine,
  showTime,
  read,
  onRetry,
}: {
  message: ChatMessage;
  mine: boolean;
  showTime: boolean;
  read: boolean;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const failed = message.status === 'failed';
  const pending = message.status === 'pending';

  return (
    <View style={{ marginBottom: showTime ? theme.spacing.md : 3, alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: '82%',
          backgroundColor: mine ? theme.colors.primaryBold : theme.colors.primarySubtle,
          borderRadius: 20,
          borderBottomRightRadius: mine ? 6 : 20,
          borderBottomLeftRadius: mine ? 20 : 6,
          paddingHorizontal: 15,
          paddingVertical: 11,
          opacity: pending ? 0.7 : 1,
        }}
      >
        <Text
          variant="body"
          color={mine ? theme.colors.onPrimary : theme.colors.textPrimary}
          style={{ fontSize: 15, lineHeight: 21 }}
        >
          {message.body}
        </Text>
      </View>

      {failed ? (
        <Pressable
          onPress={onRetry}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
        >
          <Ionicons name="alert-circle" size={13} color={theme.colors.danger} />
          <Text variant="caption" color={theme.colors.danger}>
            Not sent. Tap to retry
          </Text>
        </Pressable>
      ) : showTime ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 2 }}>
          <Text variant="caption" color={theme.colors.textTertiary}>
            {pending ? 'Sending…' : messageTime(message.createdAt)}
          </Text>
          {mine && !pending ? (
            <Ionicons
              name={read ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={read ? theme.colors.primary : theme.colors.textTertiary}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
