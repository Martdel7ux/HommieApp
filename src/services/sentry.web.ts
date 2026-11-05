import * as SentryReact from '@sentry/react';
import { env } from '@/config/env';

/**
 * Web crash/error reporting via `@sentry/react` (the plain browser SDK —
 * `@sentry/react-native` can't be imported on web at all, see git history
 * on this file). Same DSN as native; Sentry tells the platforms apart by
 * SDK name automatically. Same exported shape as sentry.ts so callers
 * (logger.ts, app/_layout.tsx) don't care which one Metro picked.
 *
 * No source-map upload for the web build yet — stack traces will be
 * minified until that's wired into the Vercel build (see vercel.json).
 */
export function initSentry() {
  if (!env.sentryDsn) return;
  SentryReact.init({
    dsn: env.sentryDsn,
    environment: env.environment,
    tracesSampleRate: env.isProduction ? 0.2 : 1.0,
  });
}

/** Reports a caught exception. No-op until `initSentry()` has a DSN to use. */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!env.sentryDsn) return;
  SentryReact.captureException(error, context ? { extra: context } : undefined);
}

/** Ties crash reports to a user by id only — never email/name (see privacy policy). */
export function setUser(userId: string | null) {
  if (!env.sentryDsn) return;
  SentryReact.setUser(userId ? { id: userId } : null);
}

// @sentry/react has no native-style root wrapper (that's a React Native
// Profiler/TouchEventBoundary thing) — init() alone is enough for the
// browser SDK to auto-capture uncaught errors and rejections. The app's own
// ErrorBoundary (see src/components/ErrorBoundary.tsx) already provides the
// fallback UI, same reasoning as native not using Sentry's own crash screen.
export const Sentry = {
  wrap<T>(component: T): T {
    return component;
  },
};
