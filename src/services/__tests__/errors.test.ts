import { AppError, toAppError, guard } from '../errors';

describe('toAppError', () => {
  it('passes an existing AppError through unchanged', () => {
    const original = new AppError('Custom message', 'custom_code');
    expect(toAppError(original)).toBe(original);
  });

  it('maps a known error code to its friendly message', () => {
    const err = toAppError({ code: 'invalid_credentials', message: 'raw supabase message' });
    expect(err.code).toBe('invalid_credentials');
    expect(err.message).toBe('That email or password is not right. Please try again.');
  });

  it('maps the custom "blocked" SQLSTATE to a friendly message', () => {
    const err = toAppError({ code: 'B0001', message: 'blocked' });
    expect(err.message).toBe("You can't message this person.");
  });

  it('falls back to the raw message for an unrecognised code', () => {
    const err = toAppError({ code: 'PGRST100', message: 'some postgrest detail' });
    expect(err.code).toBe('PGRST100');
    expect(err.message).toBe('some postgrest detail');
  });

  it('falls back to the generic message when there is no message either', () => {
    const err = toAppError({ code: 'PGRST999' });
    expect(err.message).toBe('Something went wrong. Please try again.');
  });

  it('recognises a network TypeError', () => {
    const err = toAppError(new TypeError('Network request failed'));
    expect(err.code).toBe('network');
    expect(err.message).toBe('No connection. Check your internet and try again.');
  });

  it('wraps a plain Error using its own message', () => {
    const err = toAppError(new Error('boom'));
    expect(err.code).toBe('unknown');
    expect(err.message).toBe('boom');
  });

  it('wraps a non-Error throw with the fallback message', () => {
    const err = toAppError('just a string', 'fallback text');
    expect(err.code).toBe('unknown');
    expect(err.message).toBe('fallback text');
  });

  it('accepts a custom fallback message', () => {
    const err = toAppError({}, 'Custom fallback');
    expect(err.message).toBe('Custom fallback');
  });
});

describe('guard', () => {
  it('returns the resolved value on success', async () => {
    await expect(guard(async () => 42)).resolves.toBe(42);
  });

  it('normalises and rethrows a failure as an AppError', async () => {
    await expect(
      guard(async () => {
        throw { code: 'network' };
      }),
    ).rejects.toMatchObject({ code: 'network', message: 'No connection. Check your internet and try again.' });
  });
});
