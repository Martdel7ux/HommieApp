import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { guard } from '@/services/errors';
import { analytics } from '@/services/analytics';
import type { SignInInput, SignUpInput } from './schemas';
import type { UserRole } from '@/types/database';

const redirectTo = Linking.createURL('/auth/callback');

export const authApi = {
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
            contact_name: input.contactName ?? input.firstName,
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
      await supabase.auth.signOut();
      analytics.track('sign_out');
      analytics.reset();
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
