import React, { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (body: string) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={{ backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <Pressable
          onPress={() => Alert.alert('Attachments', 'Photo attachments arrive with a later update.')}
          hitSlop={8}
          accessibilityLabel="Add attachment"
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="attach" size={24} color={theme.colors.textSecondary} />
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          style={{
            flex: 1,
            minHeight: 42,
            maxHeight: 120,
            backgroundColor: theme.colors.primarySubtle,
            borderRadius: theme.radius.xl,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: 11,
            paddingBottom: 11,
            fontSize: 15,
            color: theme.colors.textPrimary,
          }}
        />

        <Pressable
          onPress={submit}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.colors.primaryBold,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canSend ? 1 : 0.4,
          }}
        >
          <Ionicons name="send" size={17} color={theme.colors.onPrimary} style={{ marginLeft: -1 }} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
