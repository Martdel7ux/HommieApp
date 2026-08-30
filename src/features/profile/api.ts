import { supabase } from '@/lib/supabase';
import { guard } from '@/services/errors';
import type { Tables } from '@/types/database';

type ProfileUpdate = Partial<Tables<'profiles'>>;
type LandlordUpdate = Partial<Tables<'landlord_profiles'>>;

export const profileApi = {
  async getUniversities() {
    return guard(async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }, { scope: 'profile.getUniversities' });
  },

  async updateProfile(userId: string, patch: ProfileUpdate) {
    return guard(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }, { scope: 'profile.updateProfile' });
  },

  async updateLandlordProfile(userId: string, patch: LandlordUpdate) {
    return guard(async () => {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update(patch)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }, { scope: 'profile.updateLandlordProfile' });
  },

  async completeOnboarding(userId: string) {
    return this.updateProfile(userId, { onboarding_completed: true });
  },
};
