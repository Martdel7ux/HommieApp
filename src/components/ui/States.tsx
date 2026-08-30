import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { Button } from './Button';

/** Full-bleed loading spinner. */
export function LoadingState({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.xl }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {label ? <Text muted>{label}</Text> : null}
    </View>
  );
}

/** Error with retry. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.xl }}>
      <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textTertiary} />
      <Text variant="h3" align="center">
        {title}
      </Text>
      {message ? (
        <Text muted align="center">
          {message}
        </Text>
      ) : null}
      {onRetry ? <Button title="Try again" variant="secondary" fullWidth={false} onPress={onRetry} /> : null}
    </View>
  );
}

/** Empty state with optional CTA. */
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, padding: theme.spacing['3xl'] }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.xs,
        }}
      >
        <Ionicons name={icon} size={28} color={theme.colors.primary} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      {message ? (
        <Text muted align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} fullWidth={false} onPress={onAction} style={{ marginTop: theme.spacing.md }} />
      ) : null}
    </View>
  );
}
