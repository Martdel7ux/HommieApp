import * as Sentry from '@sentry/react-native';
import { env } from '@/config/env';

/**
 * Crash/error reporting. `null` until EXPO_PUBLIC_SENTRY_DSN is set — every
 * function here is a safe no-op in that case, same pattern as the PostHog
 * analytics provider (`src/services/analytics/posthog.ts`).
 *
 * The `@sentry/react-native/expo` config plugin (native source-map/dSYM
 * upload during EAS builds) is wired up in app.config.ts, reading
 * SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN from EAS secrets at build
 * time — its build-phase script uses `set -e`, so a wrong/missing token
 * fails the WHOLE build, not just the upload.
 */
export function initSentry() {
  if (!env.sentryDsn) return;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.environment,
    // Session Replay / profiling are extra cost tiers — not enabled here.
    tracesSampleRate: env.isProduction ? 0.2 : 1.0,
    enableAutoSessionTracking: true,
    // Screens already show a friendly message via ErrorBoundary; avoid Sentry's
    // own native crash-screen prompt on top of that.
    attachScreenshot: false,
  });
}

/** Reports a caught exception. No-op until `initSentry()` has a DSN to use. */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!env.sentryDsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** Ties crash reports to a user by id only — never email/name (see privacy policy). */
export function setUser(userId: string | null) {
  if (!env.sentryDsn) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
