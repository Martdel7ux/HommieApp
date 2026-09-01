import { supabase } from '@/lib/supabase';
import { guard } from '@/services/errors';
import type { NotificationType } from '@/types/database';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, string | undefined>;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  async list(limit = 50): Promise<AppNotification[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, data, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<
          {
            id: string;
            type: NotificationType;
            title: string;
            body: string | null;
            data: Record<string, string> | null;
            is_read: boolean;
            created_at: string;
          }[]
        >();
      if (error) throw error;
      return (data ?? []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data ?? {},
        isRead: n.is_read,
        createdAt: n.created_at,
      }));
    }, { scope: 'notifications.list' });
  },

  async markRead(ids: string[]) {
    if (!ids.length) return;
    return guard(async () => {
      const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
      if (error) throw error;
    }, { scope: 'notifications.markRead' });
  },
};

/** Where a notification should take you when tapped (null = no destination). */
export function notificationRoute(n: AppNotification): string | null {
  switch (n.type) {
    case 'message':
    case 'enquiry':
      return n.data.conversation_id ? `/messages/${n.data.conversation_id}` : null;
    case 'event_reminder':
      return n.data.event_id ? `/events/${n.data.event_id}` : null;
    case 'community_reply':
    case 'community_like':
      return n.data.post_id ? `/community/${n.data.post_id}` : null;
    case 'listing_saved':
      return n.data.listing_id ? `/accommodation/${n.data.listing_id}` : null;
    case 'roommate_saved':
      return n.data.profile_id ? `/roommates/${n.data.profile_id}` : null;
    default:
      return null;
  }
}
