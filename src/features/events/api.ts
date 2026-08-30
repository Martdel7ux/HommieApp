import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { resolveImage } from '@/lib/images';
import { guard } from '@/services/errors';

export interface EventCard {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location_name: string;
  city: string;
  area: string | null;
  host_name: string;
  cover_image_path: string | null;
  rsvp_count: number;
}

export const eventsApi = {
  async upcoming(limit = 5): Promise<EventCard[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, starts_at, ends_at, location_name, city, area, host_name, cover_image_path, rsvp_count')
        .eq('is_published', true)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(limit)
        .returns<EventCard[]>();
      if (error) throw error;
      return data ?? [];
    }, { scope: 'events.upcoming' });
  },
};

export function eventCover(e: Pick<EventCard, 'cover_image_path'>): string | undefined {
  return resolveImage(e.cover_image_path, STORAGE_BUCKETS.communityImages);
}
