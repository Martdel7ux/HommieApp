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
 * Web never auto-registers here (unlike native) — that would trigger an
 * unsolicited browser notification-permission prompt on every sign-in.
 * Registration only happens from the explicit opt-in toggle in Profile ›
 * Notifications (see push.ts). This component's web half is just listening
 * for push-worker.js's "a notification was clicked" message and routing it,
 * same as native's tap handlers below.
 */
export function PushBootstrap() {
  if (Platform.OS === 'web') return <PushBootstrapWeb />;
  return <PushBootstrapNative />;
}

function PushBootstrapWeb() {
  const router = useRouter();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    const onMessage = (event: MessageEvent) => {
      const path = (event.data as { type?: string; path?: string } | undefined)?.path;
      if ((event.data as { type?: string } | undefined)?.type === 'hommie-push-click' && path) {
        router.push(path as never);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  return null;
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
