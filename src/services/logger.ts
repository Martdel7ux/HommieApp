import { env } from '@/config/env';

/**
 * Minimal logger. In production, wire `capture` to a crash/error reporter
 * (Sentry, Bugsnag) — kept behind this interface so screens never call a
 * vendor SDK directly.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  if (env.isProduction && level === 'debug') return;
  const line = `[hommie:${level}] ${message}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(line, context ?? '');
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>) => emit('debug', m, c),
  info: (m: string, c?: Record<string, unknown>) => emit('info', m, c),
  warn: (m: string, c?: Record<string, unknown>) => emit('warn', m, c),
  error: (m: string, c?: Record<string, unknown>) => emit('error', m, c),
  /** Report a caught exception with optional context. */
  capture: (error: unknown, context?: Record<string, unknown>) => {
    const message = error instanceof Error ? error.message : String(error);
    emit('error', message, { ...context, stack: error instanceof Error ? error.stack : undefined });
    // TODO(release): forward to crash reporter when DSN is configured.
  },
};
