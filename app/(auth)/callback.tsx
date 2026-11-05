import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Screen, LoadingState, ErrorState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { completePendingSocialAuth } from '@/features/auth/api';

/**
 * Handles auth deep links:
 *  - email confirmation       -> session is set, AuthGate proceeds
 *  - password recovery        -> route to /reset-password
 *  - Google OAuth (web) redirect back from Supabase -> same `code` exchange
 *    as above, plus applying the role stashed before the redirect away
 */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handle(url: string | null) {
      if (!url) {
        router.replace('/(auth)/welcome');
        return;
      }
      try {
        const parsed = Linking.parse(url);
        const params = (parsed.queryParams ?? {}) as Record<string, string>;
        const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
        const hashParams = Object.fromEntries(new URLSearchParams(fragment));
        const all = { ...hashParams, ...params };

        let signedInUser: { id: string; created_at: string; last_sign_in_at?: string | null } | null = null;

        if (all.access_token && all.refresh_token) {
          const { data, error: sessErr } = await supabase.auth.setSession({
            access_token: all.access_token,
            refresh_token: all.refresh_token,
          });
          if (sessErr) throw sessErr;
          signedInUser = data.session?.user ?? null;
        } else if (all.code) {
          const { data, error: exErr } = await supabase.auth.exchangeCodeForSession(all.code);
          if (exErr) throw exErr;
          signedInUser = data.session?.user ?? null;
        }

        if (cancelled) return;
        if (signedInUser) await completePendingSocialAuth(signedInUser).catch(() => undefined);
        if (all.type === 'recovery') {
          router.replace('/(auth)/reset-password');
        } else {
          router.replace('/');
        }
      } catch (e) {
        logger.capture(e, { scope: 'auth.callback' });
        if (!cancelled) setError('This link is invalid or has expired. Please request a new one.');
      }
    }

    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router]);

  return (
    <Screen>
      {error ? <ErrorState message={error} onRetry={() => router.replace('/(auth)/welcome')} /> : <LoadingState label="Signing you in…" />}
    </Screen>
  );
}
