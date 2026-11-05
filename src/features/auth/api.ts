import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { guard, toAppError } from '@/services/errors';
import { analytics } from '@/services/analytics';
import { logger } from '@/services/logger';
import { unregisterPushToken } from '@/features/notifications/push';
import {
  getAppleCredential,
  getGoogleCredential,
  signOutGoogle,
  SocialCancelledError,
  type SocialCredential,
  type SocialProvider,
} from './social';
import type { SignInInput, SignUpInput } from './schemas';
import type { UserRole } from '@/types/database';

const redirectTo = Linking.createURL('/auth/callback');

type PendingSocialAuth = { provider: SocialProvider; role?: UserRole };
const PENDING_SOCIAL_AUTH_KEY = 'hommie.pendingSocialAuth';

/**
 * Google-on-web is a full-page redirect (Supabase's OAuth flow), not an
 * awaitable call — the page navigates away and back through
 * `/(auth)/callback`, so the role picked on the welcome screen has to
 * survive that round trip in storage rather than a closure.
 */
function stashPendingSocialAuth(data: PendingSocialAuth) {
  try {
    window.localStorage.setItem(PENDING_SOCIAL_AUTH_KEY, JSON.stringify(data));
  } catch {
    /* best-effort — a brand-new social sign-up just keeps the default role */
  }
}

function consumePendingSocialAuth(): PendingSocialAuth | null {
  try {
    const raw = window.localStorage.getItem(PENDING_SOCIAL_AUTH_KEY);
    window.localStorage.removeItem(PENDING_SOCIAL_AUTH_KEY);
    return raw ? (JSON.parse(raw) as PendingSocialAuth) : null;
  } catch {
    return null;
  }
}

/**
 * Finishes what `signInWithGoogleWeb` started, once the browser has
 * redirected back and `/(auth)/callback` has a session. Mirrors
 * `completeIdTokenSignIn`'s role application for a brand-new native social
 * sign-up; a no-op if nothing's stashed (e.g. a plain email-link callback).
 */
export async function completePendingSocialAuth(
  user: { id: string; created_at: string; last_sign_in_at?: string | null } | null | undefined,
): Promise<void> {
  const pending = consumePendingSocialAuth();
  if (!pending || !user) return;

  const createdAt = new Date(user.created_at).getTime();
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt;
  const isNewUser = Math.abs(createdAt - lastSignIn) < 5000;

  if (isNewUser && pending.role && pending.role !== 'student') {
    const { error } = await supabase.rpc('apply_selected_role', { p_role: pending.role });
    if (error) logger.capture(error, { scope: 'auth.applySelectedRole' });
  }
  analytics.track('social_sign_in_completed', { provider: pending.provider, is_new_user: isNewUser });
}

async function signInWithGoogleWeb(selectedRole: UserRole | undefined): Promise<void> {
  analytics.track('social_sign_in_started', { provider: 'google' });
  stashPendingSocialAuth({ provider: 'google', role: selectedRole });
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { prompt: 'select_account' } },
  });
  if (error) {
    const err = toAppError(error);
    logger.capture(err, { scope: 'auth.signInWith.google.web', code: err.code });
    analytics.track('social_sign_in_failed', { provider: 'google', reason: err.code });
    throw err;
  }
  // Supabase navigates the browser away to Google from here — nothing after
  // this point runs; the flow resumes in /(auth)/callback.
}

/**
 * Exchange a provider ID token for a Supabase session, then, for a brand-new
 * account, apply the role the user picked on the welcome screen and backfill
 * the name Apple hands us once. The `handle_new_user` trigger has already
 * created the base profile (role 'student') by the time this runs.
 */
async function completeIdTokenSignIn(
  credential: SocialCredential,
  selectedRole: UserRole | undefined,
): Promise<{ isNewUser: boolean }> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: credential.provider,
    token: credential.idToken,
  });
  if (error) throw error;

  const user = data.user;
  const createdAt = user?.created_at ? new Date(user.created_at).getTime() : 0;
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt;
  const isNewUser = !!user && Math.abs(createdAt - lastSignIn) < 5000;

  if (isNewUser && user) {
    if (selectedRole && selectedRole !== 'student') {
      const { error: roleErr } = await supabase.rpc('apply_selected_role', { p_role: selectedRole });
      if (roleErr) logger.capture(roleErr, { scope: 'auth.applySelectedRole' });
    }
    const given = credential.fullName?.givenName?.trim();
    const family = credential.fullName?.familyName?.trim();
    if (given) {
      await supabase
        .from('profiles')
        .update({
          first_name: given,
          last_name: family || null,
          display_name: [given, family].filter(Boolean).join(' ') || given,
        })
        .eq('id', user.id)
        .is('first_name', null);
    }
  }

  return { isNewUser };
}

async function socialSignIn(
  provider: SocialProvider,
  getCredential: () => Promise<SocialCredential>,
  selectedRole: UserRole | undefined,
): Promise<{ isNewUser: boolean }> {
  analytics.track('social_sign_in_started', { provider });
  try {
    const credential = await getCredential();
    const result = await completeIdTokenSignIn(credential, selectedRole);
    analytics.track('social_sign_in_completed', { provider, is_new_user: result.isNewUser });
    // AuthGate takes over navigation once the session propagates.
    return result;
  } catch (e) {
    if (e instanceof SocialCancelledError) throw e;
    const err = toAppError(e);
    logger.capture(err, { scope: `auth.signInWith.${provider}`, code: err.code });
    analytics.track('social_sign_in_failed', { provider, reason: err.code });
    throw err;
  }
}

export const authApi = {
  /** Native "Sign in with Apple". iOS only. */
  signInWithApple(selectedRole?: UserRole) {
    return socialSignIn('apple', getAppleCredential, selectedRole);
  },

  /** Native Google Sign-In, or Supabase's OAuth redirect flow on web. */
  signInWithGoogle(selectedRole?: UserRole) {
    if (Platform.OS === 'web') return signInWithGoogleWeb(selectedRole);
    return socialSignIn('google', getGoogleCredential, selectedRole);
  },

  async signIn({ email, password }: SignInInput) {
    return guard(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    }, { scope: 'auth.signIn' });
  },

  async signUp(input: SignUpInput) {
    return guard(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            role: input.role,
            first_name: input.firstName,
            last_name: input.lastName,
            contact_name: input.contactName ?? `${input.firstName} ${input.lastName}`.trim(),
            business_name: input.businessName,
            phone: input.phone,
          },
        },
      });
      if (error) throw error;
      analytics.track('sign_up_completed', { role: input.role });
      return data;
    }, { scope: 'auth.signUp' });
  },

  async requestPasswordReset(email: string) {
    return guard(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      analytics.track('password_reset_requested');
    }, { scope: 'auth.requestPasswordReset' });
  },

  async updatePassword(password: string) {
    return guard(async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    }, { scope: 'auth.updatePassword' });
  },

  async signOut() {
    return guard(async () => {
      await unregisterPushToken().catch(() => undefined);
      await signOutGoogle().catch(() => undefined);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The account is signed out at this point — never let a tracking hiccup
      // downstream make the caller think signOut() itself failed.
      try {
        analytics.track('sign_out');
        analytics.reset();
        logger.setUser(null);
      } catch (e) {
        logger.capture(e, { scope: 'auth.signOut.tracking' });
      }
    }, { scope: 'auth.signOut' });
  },

  /**
   * Scrubs personal data and permanently bans the login (RPC), then ends the
   * local session. The account row itself is kept (not hard-deleted) so
   * other users' conversations/listings referencing it don't break — see
   * migration 0031 for why.
   */
  async requestAccountDeletion() {
    return guard(async () => {
      const { error } = await supabase.rpc('request_account_deletion');
      if (error) throw error;
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      try {
        analytics.track('account_deletion_requested');
        analytics.reset();
        logger.setUser(null);
      } catch (e) {
        logger.capture(e, { scope: 'auth.requestAccountDeletion.tracking' });
      }
    }, { scope: 'auth.requestAccountDeletion' });
  },

  async applyToBecomeLandlord(input: { phone: string; businessName?: string; operatingAreas: string[]; message?: string }) {
    return guard(async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error('Not signed in');
      const { error } = await supabase.from('landlord_applications').insert({
        user_id: uid,
        phone: input.phone,
        business_name: input.businessName,
        operating_areas: input.operatingAreas,
        message: input.message,
      });
      if (error) throw error;
      analytics.track('landlord_application_submitted');
    }, { scope: 'auth.applyToBecomeLandlord' });
  },
};

export type { UserRole };
