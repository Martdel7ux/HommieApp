import { supabase } from '@/lib/supabase';
import { guard } from '@/services/errors';
import type { LandlordProfileDetail } from './types';

const PROFILE_SELECT = `
  id, first_name, display_name, avatar_url,
  landlord_profile:landlord_profiles (
    business_name, contact_name, description, operating_areas, verification
  )
`;

export const landlordProfileApi = {
  async get(landlordId: string): Promise<LandlordProfileDetail> {
    return guard(async () => {
      const [{ data: profile, error: profileError }, { count, error: countError }] = await Promise.all([
        supabase.from('profiles').select(PROFILE_SELECT).eq('id', landlordId).single(),
        supabase
          .from('accommodation_listings')
          .select('id', { count: 'exact', head: true })
          .eq('landlord_id', landlordId)
          .eq('status', 'active'),
      ]);
      if (profileError) throw profileError;
      if (countError) throw countError;
      return { ...(profile as unknown as LandlordProfileDetail), activeListingCount: count ?? 0 };
    }, { scope: 'landlordProfile.get' });
  },
};
