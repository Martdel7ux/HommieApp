import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

// Expo Go can't retrieve a remote push token (removed in SDK 53) — needs a build.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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
 * Register this device's Expo push token against the signed-in user. Idempotent.
 * Returns the token, or null if it couldn't (not a device / no permission / no
 * projectId).
 */
export async function registerPushToken(userId: string): Promise<string | null> {
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

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

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
  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY).catch(() => null);
    if (!token) return;
    await supabase.from('push_tokens').delete().eq('expo_push_token', token);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY).catch(() => undefined);
  } catch (e) {
    logger.capture(e, { scope: 'push.unregister' });
  }
}
