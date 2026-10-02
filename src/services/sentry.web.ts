/**
 * Web has no Sentry integration (out of scope — see the web-app plan), and
 * not just because EXPO_PUBLIC_SENTRY_DSN is unset in the web deployment's
 * env: @sentry/react-native itself can't be safely *imported* on web at
 * all. Its Session Replay native-component files
 * (RNSentryReplayMaskNativeComponent.js / …Unmask…) call
 * codegenNativeComponent() as a side effect of module evaluation — before
 * initSentry() or any DSN check ever runs — and react-native-web doesn't
 * implement that function, which crashes the entire app on load.
 *
 * This file exists purely so Metro's `.web.ts` platform resolution picks
 * it over `sentry.ts` when bundling for web, so `@sentry/react-native` is
 * never imported there at all. Same exported shape as sentry.ts, all no-ops.
 */
export function initSentry() {}
export function captureException(_error: unknown, _context?: Record<string, unknown>) {}
export function setUser(_userId: string | null) {}
export const Sentry = {
  wrap<T>(component: T): T {
    return component;
  },
};
