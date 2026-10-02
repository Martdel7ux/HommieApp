import type { useRouter } from 'expo-router';
import { confirmAlert } from '@/services/alert';

type Router = ReturnType<typeof useRouter>;

/**
 * Shown when a signed-out guest taps an account-based action (save, enquire,
 * message, …) on a screen that's otherwise open for browsing — see
 * `app/accommodation/index.tsx` / `[id].tsx` and migration 0032. Browsing
 * itself must stay free per App Review Guideline 5.1.1(v); only the action
 * is gated, and only at the point the guest actually tries to use it.
 */
export function promptSignIn(router: Router, message: string) {
  confirmAlert('Sign in to continue', message, () => router.push('/(auth)/welcome'), {
    confirmLabel: 'Sign in',
  });
}
