import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryClient';
import { useAuth } from '@/features/auth/AuthProvider';

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
