import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Single shared Supabase client for the app.
 *
 * - Uses the ANON key only. The service_role key must never reach the client.
 * - Session is persisted in AsyncStorage and auto-refreshed while the app is
 *   foregrounded (see the AppState listener below).
 * - RLS policies (see supabase/migrations) are the real security boundary; the
 *   app-side role checks are UX guard rails, not enforcement.
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
  global: {
    headers: { 'x-hommie-client': `mobile/${Platform.OS}` },
  },
});

// Keep tokens fresh only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  listingImages: 'listing-images',
  marketplaceImages: 'marketplace-images',
  communityImages: 'community-images',
  verificationDocs: 'verification-docs',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
