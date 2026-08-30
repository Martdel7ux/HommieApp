import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { resolveImage, resolveAvatar } from '@/lib/images';
import { guard } from '@/services/errors';

export type RsvpState = 'going' | 'interested';

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

export interface EventAttendee {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface EventDetail extends EventCard {
  description: string | null;
  approx_lat: number | null;
  approx_lng: number | null;
  external_url: string | null;
  created_by: string;
  myRsvp: RsvpState | null;
  attendees: EventAttendee[];
}

const CARD_COLUMNS =
  'id, title, starts_at, ends_at, location_name, city, area, host_name, cover_image_path, rsvp_count';

export const eventsApi = {
  async upcoming(limit = 5): Promise<EventCard[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('events')
        .select(CARD_COLUMNS)
        .eq('is_published', true)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(limit)
        .returns<EventCard[]>();
      if (error) throw error;
      return data ?? [];
    }, { scope: 'events.upcoming' });
  },

  async list(opts: { scope: 'upcoming' | 'going'; userId: string }): Promise<EventCard[]> {
    return guard(async () => {
      const nowIso = new Date().toISOString();

      if (opts.scope === 'going') {
        const { data, error } = await supabase
          .from('event_rsvps')
          .select(`event:events!event_rsvps_event_id_fkey ( ${CARD_COLUMNS}, is_published )`)
          .eq('user_id', opts.userId)
          .returns<{ event: (EventCard & { is_published: boolean }) | null }[]>();
        if (error) throw error;
        return (data ?? [])
          .map((r) => r.event)
          .filter((e): e is EventCard & { is_published: boolean } => !!e && e.is_published)
          .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
      }

      const { data, error } = await supabase
        .from('events')
        .select(CARD_COLUMNS)
        .eq('is_published', true)
        .gte('starts_at', nowIso)
        .order('starts_at', { ascending: true })
        .limit(50)
        .returns<EventCard[]>();
      if (error) throw error;
      return data ?? [];
    }, { scope: 'events.list' });
  },

  async get(eventId: string, userId: string): Promise<EventDetail> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('events')
        .select(
          `${CARD_COLUMNS}, description, approx_lat, approx_lng, external_url, created_by`,
        )
        .eq('id', eventId)
        .single<Omit<EventDetail, 'myRsvp' | 'attendees'>>();
      if (error) throw error;

      const [{ data: mine }, { data: rsvps }] = await Promise.all([
        supabase
          .from('event_rsvps')
          .select('state')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .maybeSingle<{ state: RsvpState }>(),
        supabase
          .from('event_rsvps')
          .select(
            `user_id, created_at,
             profile:profiles!event_rsvps_user_id_fkey ( id, first_name, display_name, avatar_url )`,
          )
          .eq('event_id', eventId)
          .order('created_at', { ascending: true })
          .limit(12)
          .returns<
            {
              user_id: string;
              profile: {
                id: string;
                first_name: string | null;
                display_name: string | null;
                avatar_url: string | null;
              } | null;
            }[]
          >(),
      ]);

      const attendees: EventAttendee[] = (rsvps ?? []).map((r) => ({
        id: r.user_id,
        name: r.profile?.first_name ?? r.profile?.display_name ?? 'Student',
        avatarUrl: resolveAvatar(r.profile?.avatar_url) ?? null,
      }));

      return { ...data, myRsvp: mine?.state ?? null, attendees };
    }, { scope: 'events.get' });
  },

  async setRsvp(eventId: string, userId: string, next: RsvpState | null) {
    return guard(async () => {
      if (next === null) {
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from('event_rsvps')
        .upsert({ event_id: eventId, user_id: userId, state: next }, { onConflict: 'event_id,user_id' });
      if (error) throw error;
    }, { scope: 'events.setRsvp' });
  },
};

export function eventCover(e: Pick<EventCard, 'cover_image_path'>): string | undefined {
  return resolveImage(e.cover_image_path, STORAGE_BUCKETS.communityImages);
}
