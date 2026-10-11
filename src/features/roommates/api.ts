import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { uploadImage } from '@/lib/upload';
import { guard } from '@/services/errors';
import { PAGE_SIZE } from '@/config/constants';
import type { StudentAudience, HousingStatus } from '@/types/database';
import type {
  DraftFlatPhoto,
  RoommateFilters,
  RoommatePage,
  RoommateProfileCard,
  RoommateProfileDetail,
} from './types';

export interface RoommatePrefPatch {
  headline?: string | null;
  about?: string | null;
  age?: number | null;
  preferred_city?: string | null;
  preferred_areas?: string[];
  university_id?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  move_in_from?: string | null;
  move_in_to?: string | null;
  sleep_schedule?: 'early_bird' | 'night_owl' | 'flexible' | null;
  social_level?: 'homebody' | 'balanced' | 'very_social' | null;
  cleanliness?: number | null;
  guests_frequency?: 'rarely' | 'sometimes' | 'often' | null;
  smoking?: 'yes' | 'no' | 'outside_only' | 'no_preference';
  pets?: 'yes' | 'no' | 'no_preference';
  gender_preference?: 'same' | 'any' | 'no_preference';
  lifestyle_tags?: string[];
  is_published?: boolean;
  student_audience?: StudentAudience;
  housing_status?: HousingStatus | null;
  flat_rent_month?: number | null;
}

const DETAIL_SELECT = `
  user_id, is_published, headline, about, age, preferred_city, preferred_areas, budget_min, budget_max,
  move_in_from, move_in_to, smoking, pets, cleanliness, sleep_schedule, social_level,
  guests_frequency, gender_preference, lifestyle_tags, university_id,
  student_audience, housing_status, flat_rent_month,
  flat_photos:roommate_flat_photos ( id, storage_path, position ),
  profile:profiles!roommate_preferences_user_id_fkey (
    id, first_name, last_name, display_name, avatar_url, study_level, interests, verification
  ),
  university:universities ( name, short_name )
`;

const CARD_SELECT = `
  user_id, headline, about, age, preferred_city, preferred_areas, budget_min, budget_max,
  move_in_from, smoking, sleep_schedule, social_level, cleanliness, lifestyle_tags,
  student_audience, housing_status,
  profile:profiles!roommate_preferences_user_id_fkey (
    id, first_name, last_name, display_name, avatar_url, study_level, verification
  ),
  university:universities ( name, short_name )
`;

async function syncFlatPhotos(userId: string, photos: DraftFlatPhoto[]) {
  const keptIds = new Set(
    photos.map((p) => p.existing?.id).filter((id): id is string => !!id),
  );
  const { data: current } = await supabase
    .from('roommate_flat_photos')
    .select('id, storage_path')
    .eq('user_id', userId);

  const removed = (current ?? []).filter((r) => !keptIds.has(r.id));
  if (removed.length) {
    await supabase
      .from('roommate_flat_photos')
      .delete()
      .in(
        'id',
        removed.map((r) => r.id),
      );
    const paths = removed
      .map((r) => r.storage_path)
      .filter((p) => !/^https?:\/\//i.test(p));
    if (paths.length) {
      await supabase.storage.from(STORAGE_BUCKETS.roommateFlatImages).remove(paths).catch(() => undefined);
    }
  }

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    if (photo.existing) {
      await supabase
        .from('roommate_flat_photos')
        .update({ position: i })
        .eq('id', photo.existing.id);
      continue;
    }
    const path = await uploadImage(
      STORAGE_BUCKETS.roommateFlatImages,
      `${userId}/flat`,
      photo.uri,
    );
    await supabase
      .from('roommate_flat_photos')
      .insert({ user_id: userId, storage_path: path, position: i });
  }
}

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
      if (filters.studentAudience) q = q.in('student_audience', [filters.studentAudience, 'both']);
      if (filters.housingStatus) q = q.eq('housing_status', filters.housingStatus);

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

  /** The signed-in user's own roommate preferences row (published or not). */
  async getMine(userId: string): Promise<RoommateProfileDetail | null> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('roommate_preferences')
        .select(DETAIL_SELECT)
        .eq('user_id', userId)
        .maybeSingle<Omit<RoommateProfileDetail, 'saved'>>();
      if (error) throw error;
      return data ? { ...data, saved: false } : null;
    }, { scope: 'roommates.getMine' });
  },

  /** Create or update the signed-in student's own roommate preferences row.
   * Pass `photos` (even `[]`) to also sync the "has a flat" photo gallery —
   * omit it entirely for saves that don't touch photos. */
  async upsertPreferences(userId: string, patch: RoommatePrefPatch, photos?: DraftFlatPhoto[]) {
    return guard(async () => {
      const { error } = await supabase
        .from('roommate_preferences')
        .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
      if (error) throw error;
      if (photos !== undefined) await syncFlatPhotos(userId, photos);
    }, { scope: 'roommates.upsertPreferences' });
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
