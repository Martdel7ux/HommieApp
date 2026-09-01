import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryClient';
import { useAuth } from '@/features/auth/AuthProvider';
import { notificationsApi, type AppNotification } from './api';

export function useNotifications() {
  const { status } = useAuth();
  return useQuery({
    queryKey: qk.notifications,
    enabled: status === 'signed_in',
    queryFn: () => notificationsApi.list(),
  });
}

/** Marks the given notification ids read, optimistically. Pass no ids to mark all loaded ones. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: qk.notifications });
      const prev = queryClient.getQueryData<AppNotification[]>(qk.notifications);
      const set = new Set(ids);
      queryClient.setQueryData<AppNotification[]>(qk.notifications, (list) =>
        (list ?? []).map((n) => (set.has(n.id) ? { ...n, isRead: true } : n)),
      );
      queryClient.setQueryData<number>(qk.unreadNotifications, (c) =>
        Math.max(0, (c ?? 0) - ids.length),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qk.notifications, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications });
      queryClient.invalidateQueries({ queryKey: qk.unreadNotifications });
    },
  });
}

/** Unread in-app notification count. Drives the bell / Messages tab dot. */
export function useUnreadNotificationCount() {
  const { status } = useAuth();
  return useQuery({
    queryKey: qk.unreadNotifications,
    enabled: status === 'signed_in',
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('unread_notification_count');
      if (error) throw error;
      return data ?? 0;
    },
  });
}
