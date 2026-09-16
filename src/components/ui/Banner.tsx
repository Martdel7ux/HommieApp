import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const ICONS: Record<Tone, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'alert-circle-outline',
  danger: 'warning-outline',
};

export function Banner({
  tone = 'info',
  title,
  message,
  onPress,
  onDismiss,
}: {
  tone?: Tone;
  title?: string;
  message: string;
  onPress?: () => void;
  onDismiss?: () => void;
}) {
  const theme = useTheme();
  const bg = {
    info: theme.colors.infoSubtle,
    success: theme.colors.successSubtle,
    warning: theme.colors.warningSubtle,
    danger: theme.colors.dangerSubtle,
  }[tone];
  const fg = {
    info: theme.colors.info,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  }[tone];

  const content = (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: theme.spacing.sm,
        backgroundColor: bg,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
      }}
    >
      <Ionicons name={ICONS[tone]} size={18} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Text variant="label" color={fg}>
            {title}
          </Text>
        ) : null}
        <Text variant="bodySm" color={theme.colors.textPrimary}>
          {message}
        </Text>
      </View>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={18} color={fg} />
        </Pressable>
      ) : null}
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  ) : (
    content
  );
}
