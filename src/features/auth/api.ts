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

  /** Native Google Sign-In. */
  signInWithGoogle(selectedRole?: UserRole) {
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

  async resendVerification(email: string) {
    return guard(async () => {
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      analytics.track('email_verification_sent');
    }, { scope: 'auth.resendVerification' });
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
      await signOutGoogle();
      await supabase.auth.signOut();
      analytics.track('sign_out');
      analytics.reset();
      logger.setUser(null);
    }, { scope: 'auth.signOut' });
  },

  /** Soft delete: flags the profile; a staff job / edge function removes the auth user. */
  async requestAccountDeletion() {
    return guard(async () => {
      const { error } = await supabase.rpc('request_account_deletion');
      if (error) throw error;
      analytics.track('account_deletion_requested');
      await supabase.auth.signOut();
      analytics.reset();
      logger.setUser(null);
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
