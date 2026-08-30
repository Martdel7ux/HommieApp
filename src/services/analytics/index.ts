import { env } from '@/config/env';
import { logger } from '@/services/logger';
import type { AnalyticsEventMap, AnalyticsEventName } from './events';

/**
 * Central analytics interface.
 *
 * - Every event name + payload is typed via `AnalyticsEventMap` (see events.ts).
 * - Providers implement `AnalyticsProvider`. Register real ones in `configure()`.
 * - When `EXPO_PUBLIC_ANALYTICS_ENABLED` is false, events are still validated
 *   and (in dev) logged, but not forwarded anywhere.
 */
export interface AnalyticsProvider {
  name: string;
  identify(userId: string | null, traits?: Record<string, unknown>): void;
  track(event: string, properties?: Record<string, unknown>): void;
  screen(name: string, properties?: Record<string, unknown>): void;
  reset(): void;
}

class Analytics {
  private providers: AnalyticsProvider[] = [];
  private enabled = env.analyticsEnabled;
  private superProps: Record<string, unknown> = { app_env: env.environment };
  private currentUserId: string | null = null;

  configure(providers: AnalyticsProvider[], options?: { enabled?: boolean }) {
    this.providers = providers;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    logger.info('analytics configured', { providers: providers.map((p) => p.name), enabled: this.enabled });
  }

  /** Attach properties sent with every subsequent event. */
  register(props: Record<string, unknown>) {
    this.superProps = { ...this.superProps, ...props };
  }

  identify(userId: string | null, traits?: Record<string, unknown>) {
    this.currentUserId = userId;
    if (!this.enabled) return;
    this.providers.forEach((p) => this.safe(() => p.identify(userId, traits)));
  }

  track<E extends AnalyticsEventName>(
    event: E,
    ...args: AnalyticsEventMap[E] extends Record<string, never> ? [] : [AnalyticsEventMap[E]]
  ) {
    const properties = { ...this.superProps, ...(args[0] ?? {}) };
    if (__DEV__ && !this.enabled) logger.debug(`analytics(dry) ${event}`, properties);
    if (!this.enabled) return;
    this.providers.forEach((p) => this.safe(() => p.track(event, properties)));
  }

  screen(name: string, properties?: Record<string, unknown>) {
    if (!this.enabled) return;
    this.providers.forEach((p) => this.safe(() => p.screen(name, { ...this.superProps, ...properties })));
  }

  reset() {
    this.currentUserId = null;
    this.providers.forEach((p) => this.safe(() => p.reset()));
  }

  private safe(fn: () => void) {
    try {
      fn();
    } catch (e) {
      logger.capture(e, { scope: 'analytics' });
    }
  }
}

export const analytics = new Analytics();
export type { AnalyticsEventName, AnalyticsEventMap } from './events';

/**
 * Example no-op provider that just logs. Replace / add real providers
 * (PostHog, Segment, Amplitude) in app bootstrap without touching call sites.
 */
export const consoleAnalyticsProvider: AnalyticsProvider = {
  name: 'console',
  identify: (id) => logger.debug('analytics.identify', { id }),
  track: (event, props) => logger.debug(`analytics.track ${event}`, props),
  screen: (name) => logger.debug('analytics.screen', { name }),
  reset: () => logger.debug('analytics.reset'),
};
