import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { useAuth } from '@/features/auth/AuthProvider';
import { registerPushToken } from '@/features/notifications/push';
import { routeForNotification } from '@/features/notifications/api';
import { readNotificationPrefs } from '@/features/profile/notifications';

function routeFrom(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, string | undefined>;
  return routeForNotification(d.type, d);
}

/**
 * Renders nothing. Wires the device up for push once signed in, keeps the
 * in-app list fresh when a push lands in the foreground, and routes taps to the
 * right screen. Everything here is a safe no-op until push credentials exist.
 *
 * Web push isn't built (out of scope for the web app — see the web-app
 * plan), so this never mounts the real logic on web at all: not because
 * anything here would crash (expo-notifications degrades gracefully), but
 * registerPushToken() would otherwise trigger an unsolicited browser
 * notification-permission prompt on every web sign-in.
 */
export function PushBootstrap() {
  if (Platform.OS === 'web') return null;
  return <PushBootstrapNative />;
}

function PushBootstrapNative() {
  const { user, status, profile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const handledColdStart = useRef(false);

  const pushEnabled = profile ? readNotificationPrefs(profile.notification_prefs).push : true;

  // Register the token when signed in (and the user hasn't turned push off).
  useEffect(() => {
    if (status === 'signed_in' && user && pushEnabled) {
      void registerPushToken(user.id);
    }
  }, [status, user, pushEnabled]);

  // Token rotation.
  useEffect(() => {
    const sub = Notifications.addPushTokenListener(() => {
      if (user && pushEnabled) void registerPushToken(user.id);
    });
    return () => sub.remove();
  }, [user, pushEnabled]);

  // A push arriving while the app is open — refresh the bell + list.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: qk.notifications });
      queryClient.invalidateQueries({ queryKey: qk.unreadNotifications });
    });
    return () => sub.remove();
  }, [queryClient]);

  // Tapping a push → deep link.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeFrom(response.notification.request.content.data);
      if (route) router.push(route as never);
    });
    return () => sub.remove();
  }, [router]);

  // Cold start: the app was launched by tapping a push.
  useEffect(() => {
    if (handledColdStart.current || status === 'loading') return;
    handledColdStart.current = true;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const route = response && routeFrom(response.notification.request.content.data);
      if (route) router.push(route as never);
    });
  }, [status, router]);

  return null;
}
