import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { env } from '@/config/env';

// Expo Go can't retrieve a remote push token (removed in SDK 53) — needs a build.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const SERVICE_WORKER_PATH = '/push-worker.js';
const WEB_SUBSCRIPTION_STORAGE_KEY = 'hommie.pushSubscriptionEndpoint';

// https://github.com/web-push-libs/web-push#using-vapid-key-for-applicationserverkey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Push-notification plumbing (Expo push service).
 *
 * The app still works fully without any of this — every code path here degrades
 * to a no-op on a simulator, when the OS permission isn't granted, or before
 * `eas init` gives the project a push `projectId`. See docs/PUSH_NOTIFICATIONS_SETUP.md.
 */

// How a notification behaves while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const ANDROID_CHANNEL_ID = 'default';
const TOKEN_STORAGE_KEY = 'hommie.pushToken';

function easProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    // set on native builds by EAS
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Hommie',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#4F46E5',
  });
}

export async function getPushPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Prompt for the OS permission. Returns true if granted. */
export async function requestPushPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Web has no "Expo push token" — subscribes the browser directly via the
 * Push API/VAPID instead (see push-worker.js and the push-notify edge
 * function's web branch). Only reached from a user-initiated opt-in (the
 * Profile › Notifications toggle), never auto-registered on sign-in, so
 * the browser's own permission prompt is never unsolicited.
 */
async function registerWebPushToken(userId: string): Promise<string | null> {
  try {
    if (!env.vapidPublicKey) {
      logger.warn('push.web: no VAPID public key configured — skipping');
      return null;
    }
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null; // e.g. Safari, which doesn't support the standard Push API/VAPID yet
    }
    if (Notification.permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
    await navigator.serviceWorker.ready;

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey) as BufferSource,
      }));

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      throw new Error('Browser returned an incomplete push subscription');
    }

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        platform: 'web',
        web_push_endpoint: json.endpoint,
        web_push_keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,web_push_endpoint' },
    );
    if (error) throw error;

    await AsyncStorage.setItem(WEB_SUBSCRIPTION_STORAGE_KEY, json.endpoint).catch(() => undefined);
    return json.endpoint;
  } catch (e) {
    logger.capture(e, { scope: 'push.web.register' });
    return null;
  }
}

async function unregisterWebPushToken(): Promise<void> {
  try {
    const endpoint = await AsyncStorage.getItem(WEB_SUBSCRIPTION_STORAGE_KEY).catch(() => null);
    if (!endpoint) return;
    await supabase.from('push_tokens').delete().eq('web_push_endpoint', endpoint);
    await AsyncStorage.removeItem(WEB_SUBSCRIPTION_STORAGE_KEY).catch(() => undefined);
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
    }
  } catch (e) {
    logger.capture(e, { scope: 'push.web.unregister' });
  }
}

/**
 * Register this device's Expo push token against the signed-in user. Idempotent.
 * Returns the token, or null if it couldn't (not a device / no permission / no
 * projectId).
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return registerWebPushToken(userId);
  try {
    if (!Device.isDevice || isExpoGo) return null;

    let { status } = await Notifications.getPermissionsAsync();
    // First time we've ever asked — actually show the OS prompt. If the user
    // already answered before (granted or denied), respect that and don't
    // ask again here; a denied user can still turn it on via Profile ›
    // Notifications, which links out to Settings.
    if (status === 'undetermined') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    await ensureAndroidChannel();

    const projectId = easProjectId();
    if (!projectId) {
      logger.warn('push: no EAS projectId yet — skipping token registration');
      return null;
    }

    // iOS: getExpoPushTokenAsync would otherwise auto-detect sandbox vs
    // production via expo-application's native helper — that auto-detection
    // was reporting the wrong environment for our TestFlight build (every
    // push failed with APNs' "BadEnvironmentKeyInToken"), so tell it
    // explicitly using our own already-reliable build config instead.
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
      development: !env.isProduction,
    });

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
        device_id: Device.modelName ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' },
    );
    if (error) throw error;

    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token).catch(() => undefined);
    return token;
  } catch (e) {
    logger.capture(e, { scope: 'push.register' });
    return null;
  }
}

/** Remove this device's token — call on sign-out so the next user isn't pushed. */
export async function unregisterPushToken(): Promise<void> {
  if (Platform.OS === 'web') return unregisterWebPushToken();
  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY).catch(() => null);
    if (!token) return;
    await supabase.from('push_tokens').delete().eq('expo_push_token', token);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY).catch(() => undefined);
  } catch (e) {
    logger.capture(e, { scope: 'push.unregister' });
  }
}
