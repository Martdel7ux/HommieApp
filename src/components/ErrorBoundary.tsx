import React from 'react';
import { View } from 'react-native';
import { Text, Button } from '@/components/ui';
import { theme } from '@/theme';
import { logger } from '@/services/logger';

interface State {
  hasError: boolean;
  error?: Error;
}

/** Last-resort UI so a render crash never shows a white screen. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.capture(error, { scope: 'ErrorBoundary', componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.xl,
          gap: theme.spacing.md,
          backgroundColor: theme.colors.background,
        }}
      >
        <Text variant="h2" align="center">
          The app hit a snag
        </Text>
        <Text muted align="center">
          Please restart Hommie. If this keeps happening, contact support.
        </Text>
        <Button
          title="Try to recover"
          fullWidth={false}
          onPress={() => this.setState({ hasError: false, error: undefined })}
        />
      </View>
    );
  }
}
