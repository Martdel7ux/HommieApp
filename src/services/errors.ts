import { PostgrestError } from '@supabase/supabase-js';
import { logger } from './logger';

/**
 * Normalises any thrown value into a user-safe message + a stable code.
 * Screens show `message`; telemetry uses `code`.
 */
export class AppError extends Error {
  code: string;
  cause?: unknown;
  constructor(message: string, code = 'unknown', cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

const FRIENDLY: Record<string, string> = {
  'invalid_credentials': 'That email or password is not right. Please try again.',
  'email_not_confirmed': 'Please confirm your email address first. Check your inbox.',
  'user_already_exists': 'An account with this email already exists. Try signing in.',
  'over_email_send_rate_limit': 'Too many attempts. Please wait a minute and try again.',
  'weak_password': 'Please choose a stronger password (at least 8 characters).',
  'network': 'No connection. Check your internet and try again.',
  '23505': 'That already exists.',
  '42501': 'You do not have permission to do that.',
};

export function toAppError(error: unknown, fallback = 'Something went wrong. Please try again.'): AppError {
  if (error instanceof AppError) return error;

  // Supabase auth error shape
  if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string') {
    const code = (error as any).code as string;
    const message = FRIENDLY[code] ?? (error as any).message ?? fallback;
    return new AppError(message, code, error);
  }

  // Postgrest error
  const pg = error as PostgrestError | undefined;
  if (pg && pg.code) {
    return new AppError(FRIENDLY[pg.code] ?? fallback, pg.code, error);
  }

  if (error instanceof TypeError && /network|fetch/i.test(error.message)) {
    return new AppError(FRIENDLY.network, 'network', error);
  }

  if (error instanceof Error) return new AppError(error.message || fallback, 'unknown', error);
  return new AppError(fallback, 'unknown', error);
}

/** Wrap an async call, logging + rethrowing a normalised AppError. */
export async function guard<T>(fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
  try {
    return await fn();
  } catch (raw) {
    const err = toAppError(raw);
    logger.capture(err, { ...context, code: err.code });
    throw err;
  }
}
