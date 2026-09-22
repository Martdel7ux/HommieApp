import * as Sentry from '@sentry/react-native';
import { env } from '@/config/env';

/**
 * Crash/error reporting. `null` until EXPO_PUBLIC_SENTRY_DSN is set — every
 * function here is a safe no-op in that case, same pattern as the PostHog
 * analytics provider (`src/services/analytics/posthog.ts`).
 *
 * NOTE: only the JS-side SDK is wired up so far. The `@sentry/react-native/expo`
 * config plugin (native source-map/dSYM upload during EAS builds) is NOT yet
 * added to app.config.ts — it needs SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN
 * and its build-phase script fails the whole build if those are missing or
 * wrong. Add it once those are set and confirmed with EAS secrets, and verify
 * with a real build before relying on it.
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
