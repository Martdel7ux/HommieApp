import { supabase } from '@/lib/supabase';
import { guard } from '@/services/errors';
import { PAGE_SIZE } from '@/config/constants';
import type {
  RoommateFilters,
  RoommatePage,
  RoommateProfileCard,
  RoommateProfileDetail,
} from './types';

const DETAIL_SELECT = `
  user_id, headline, about, age, preferred_city, preferred_areas, budget_min, budget_max,
  move_in_from, move_in_to, smoking, pets, cleanliness, sleep_schedule, social_level,
  guests_frequency, gender_preference, lifestyle_tags, university_id,
  profile:profiles!roommate_preferences_user_id_fkey (
    id, first_name, last_name, display_name, avatar_url, study_level
  ),
  university:universities ( name, short_name )
`;

const CARD_SELECT = `
  user_id, headline, about, age, preferred_city, preferred_areas, budget_min, budget_max,
  move_in_from, smoking, sleep_schedule, social_level, cleanliness, lifestyle_tags,
  profile:profiles!roommate_preferences_user_id_fkey (
    id, first_name, last_name, display_name, avatar_url, study_level
  ),
  university:universities ( name, short_name )
`;

export const roommatesApi = {
  async list(
    filters: RoommateFilters = {},
    opts: { limit?: number; offset?: number; excludeUserId?: string; withCount?: boolean } = {},
  ): Promise<RoommatePage> {
    return guard(async () => {
      let q = supabase
        .from('roommate_preferences')
        .select(CARD_SELECT, opts.withCount ? { count: 'exact' } : undefined)
        .eq('is_published', true);

      if (opts.excludeUserId) q = q.neq('user_id', opts.excludeUserId);
      if (filters.universityId) q = q.eq('university_id', filters.universityId);
      if (filters.budgetMax != null) q = q.lte('budget_min', filters.budgetMax);
      if (filters.area) q = q.contains('preferred_areas', [filters.area]);

      if (filters.sort === 'budget_low') q = q.order('budget_min', { ascending: true, nullsFirst: false });
      else q = q.order('updated_at', { ascending: false });

      const limit = opts.limit ?? PAGE_SIZE.roommates;
      const offset = opts.offset ?? 0;

      const { data, error, count } = await q
        .range(offset, offset + limit - 1)
        .returns<RoommateProfileCard[]>();
      if (error) throw error;
      return { rows: data ?? [], count: count ?? data?.length ?? 0 };
    }, { scope: 'roommates.list' });
  },

  async get(userId: string): Promise<RoommateProfileCard | null> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('roommate_preferences')
        .select(CARD_SELECT)
        .eq('user_id', userId)
        .maybeSingle<RoommateProfileCard>();
      if (error) throw error;
      return data;
    }, { scope: 'roommates.get' });
  },

  async getDetail(userId: string, viewerId: string): Promise<RoommateProfileDetail | null> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('roommate_preferences')
        .select(DETAIL_SELECT)
        .eq('user_id', userId)
        .eq('is_published', true)
        .maybeSingle<Omit<RoommateProfileDetail, 'saved'>>();
      if (error) throw error;
      if (!data) return null;

      const { data: sv } = await supabase
        .from('saved_roommate_profiles')
        .select('saved_profile_id')
        .eq('user_id', viewerId)
        .eq('saved_profile_id', userId)
        .maybeSingle();

      return { ...data, saved: !!sv };
    }, { scope: 'roommates.getDetail' });
  },

  async toggleSave(viewerId: string, profileId: string, next: boolean) {
    return guard(async () => {
      if (next) {
        const { error } = await supabase
          .from('saved_roommate_profiles')
          .insert({ user_id: viewerId, saved_profile_id: profileId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('saved_roommate_profiles')
          .delete()
          .eq('user_id', viewerId)
          .eq('saved_profile_id', profileId);
        if (error) throw error;
      }
    }, { scope: 'roommates.toggleSave' });
  },

  /** Does the signed-in user have a published roommate profile of their own? */
  async hasPublishedProfile(userId: string): Promise<boolean> {
    return guard(async () => {
      const { count, error } = await supabase
        .from('roommate_preferences')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_published', true);
      if (error) throw error;
      return (count ?? 0) > 0;
    }, { scope: 'roommates.hasPublishedProfile' });
  },

  // Plain array (see note in accommodation/api.ts) — Sets don't survive the
  // persisted query cache.
  async savedIds(userId: string): Promise<string[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('saved_roommate_profiles')
        .select('saved_profile_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.saved_profile_id);
    }, { scope: 'roommates.savedIds' });
  },
};
