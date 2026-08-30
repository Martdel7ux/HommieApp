import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Small, sensitive key/value pairs (auth-related flags, push token id).
 * SecureStore is backed by the iOS Keychain / Android Keystore and is limited
 * to ~2KB per value — do not use it for large blobs.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * Larger, non-secret persisted state (query cache, onboarding progress).
 */
export const appStorage = AsyncStorage;

export const STORAGE_KEYS = {
  querycache: 'hommie.query-cache.v2',
  onboardingDraft: 'hommie.onboarding-draft.v1',
  lastRoleHint: 'hommie.last-role-hint.v1',
  pushTokenSynced: 'hommie.push-token-synced.v1',
} as const;
