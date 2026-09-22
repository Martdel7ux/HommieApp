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
        // New messages already surface their own unread state on the
        // Messages tab — showing them here too would be a duplicate signal.
        .neq('type', 'message')
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

/**
 * Where a notification should take you when tapped (null = no destination).
 * Shared by the in-app list and the push-notification tap handler.
 */
export function routeForNotification(
  type: NotificationType | string | undefined,
  data: Record<string, string | undefined>,
): string | null {
  switch (type) {
    case 'message':
    case 'enquiry':
      return data.conversation_id
        ? `/messages/${data.conversation_id}`
        : data.listing_id
          ? `/listing/${data.listing_id}`
          : null;
    case 'event_reminder':
      return data.event_id ? `/events/${data.event_id}` : null;
    case 'community_reply':
    case 'community_like':
      return data.post_id ? `/community/${data.post_id}` : null;
    case 'listing_saved':
      return data.listing_id ? `/accommodation/${data.listing_id}` : null;
    case 'roommate_saved':
      return data.profile_id ? `/roommates/${data.profile_id}` : null;
    case 'system':
      return data.kind === 'verification'
        ? '/profile/verification'
        : data.listing_id
          ? `/listing/${data.listing_id}`
          : null;
    default:
      return null;
  }
}

export function notificationRoute(n: AppNotification): string | null {
  return routeForNotification(n.type, n.data);
}
