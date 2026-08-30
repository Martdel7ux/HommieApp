import { supabase } from '@/lib/supabase';
import { guard } from '@/services/errors';
import { PAGE_SIZE } from '@/config/constants';
import type { RoommateProfileCard } from './types';

const CARD_SELECT = `
  user_id, headline, about, preferred_city, preferred_areas, budget_min, budget_max,
  move_in_from, smoking, sleep_schedule, social_level, cleanliness, lifestyle_tags,
  profile:profiles!roommate_preferences_user_id_fkey (
    id, first_name, display_name, avatar_url, study_level
  ),
  university:universities ( name, short_name )
`;

export const roommatesApi = {
  async list(
    opts: { limit?: number; offset?: number; excludeUserId?: string; city?: string } = {},
  ): Promise<RoommateProfileCard[]> {
    return guard(async () => {
      let q = supabase
        .from('roommate_preferences')
        .select(CARD_SELECT)
        .eq('is_published', true)
        .order('updated_at', { ascending: false });

      if (opts.excludeUserId) q = q.neq('user_id', opts.excludeUserId);
      if (opts.city) q = q.eq('preferred_city', opts.city);

      const limit = opts.limit ?? PAGE_SIZE.roommates;
      const offset = opts.offset ?? 0;

      const { data, error } = await q
        .range(offset, offset + limit - 1)
        .returns<RoommateProfileCard[]>();
      if (error) throw error;
      return data ?? [];
    }, { scope: 'roommates.list' });
  },

  async savedIds(userId: string): Promise<Set<string>> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('saved_roommate_profiles')
        .select('saved_profile_id')
        .eq('user_id', userId);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.saved_profile_id));
    }, { scope: 'roommates.savedIds' });
  },
};
