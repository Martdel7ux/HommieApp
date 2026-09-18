import { PostHog } from 'posthog-react-native';
import { env } from '@/config/env';
import { logger } from '@/services/logger';
import type { AnalyticsProvider } from './index';

/**
 * PostHog-backed provider. `null` until both EXPO_PUBLIC_POSTHOG_API_KEY and
 * EXPO_PUBLIC_POSTHOG_HOST are set — analytics.configure() simply omits this
 * provider in that case, so the app still runs fine without it configured.
 */
export const posthogClient =
  env.posthogApiKey && env.posthogHost
    ? new PostHog(env.posthogApiKey, { host: env.posthogHost })
    : null;

// Our AnalyticsEventMap only ever holds JSON-safe values (see events.ts),
// which satisfies PostHog's stricter property type — the cast just bridges
// the two type definitions, not the runtime shape.
type PostHogProps = Parameters<PostHog['capture']>[1];

export const posthogAnalyticsProvider: AnalyticsProvider | null = posthogClient && {
  name: 'posthog',
  identify: (userId, traits) => {
    if (userId) posthogClient.identify(userId, traits as PostHogProps);
  },
  track: (event, properties) => {
    posthogClient.capture(event, properties as PostHogProps);
  },
  screen: (name, properties) => {
    posthogClient.screen(name, properties as PostHogProps);
  },
  reset: () => {
    posthogClient.reset();
  },
};

if (!posthogAnalyticsProvider) {
  logger.info('posthog: not configured (missing API key/host) — skipping');
}
