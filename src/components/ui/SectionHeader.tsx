import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
      }}
    >
      <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 }}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
        >
          <Text variant="label" color={theme.colors.primary}>
            {actionLabel}
          </Text>
          <Ionicons name="arrow-forward" size={15} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
