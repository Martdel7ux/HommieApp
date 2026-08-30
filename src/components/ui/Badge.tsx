import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTheme();
  const map: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.surfaceSunken, fg: theme.colors.textSecondary },
    brand: { bg: theme.colors.primarySubtle, fg: theme.colors.primaryPressed },
    success: { bg: theme.colors.successSubtle, fg: theme.colors.success },
    warning: { bg: theme.colors.warningSubtle, fg: theme.colors.warning },
    danger: { bg: theme.colors.dangerSubtle, fg: theme.colors.danger },
    info: { bg: theme.colors.infoSubtle, fg: theme.colors.info },
  };
  const c = map[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: c.bg,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 3,
        borderRadius: theme.radius.pill,
      }}
    >
      {icon ? <Ionicons name={icon} size={12} color={c.fg} /> : null}
      <Text variant="overline" color={c.fg}>
        {label}
      </Text>
    </View>
  );
}
