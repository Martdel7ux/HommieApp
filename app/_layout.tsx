import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/theme';
import { queryClient, queryPersister } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { analytics, consoleAnalyticsProvider } from '@/services/analytics';
import { posthogAnalyticsProvider } from '@/services/analytics/posthog';
import { initSentry, Sentry } from '@/services/sentry';
import { AuthGate } from '@/features/auth/AuthGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PushBootstrap } from '@/components/PushBootstrap';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// On web this resolves to src/services/sentry.web.ts (all no-ops) via
// Metro's platform extension — see that file for why the real
// @sentry/react-native import can't happen on web at all.
initSentry();

analytics.configure(
  [consoleAnalyticsProvider, posthogAnalyticsProvider].filter((p) => p != null),
);

function RootStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}

function RootLayout() {
  useEffect(() => {
    analytics.track('app_opened', { cold_start: true });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ErrorBoundary>
            <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
              <AuthProvider>
                <AuthGate>
                  <RootStack />
                  <PushBootstrap />
                </AuthGate>
              </AuthProvider>
            </PersistQueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap is a no-op passthrough until a DSN is configured (native) or
// always (web, via sentry.web.ts) — safe to always wrap.
export default Sentry.wrap(RootLayout);
