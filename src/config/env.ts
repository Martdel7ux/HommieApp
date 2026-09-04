import Constants from 'expo-constants';

/**
 * Typed, validated access to public runtime configuration.
 * Fails fast in development if required values are missing.
 */
type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  appleSignInEnabled?: boolean;
  analyticsEnabled?: boolean;
  environment?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function required(value: string | undefined, key: string): string {
  if (!value) {
    const message = `[env] Missing required configuration: ${key}. Copy .env.example to .env and fill it in.`;
    if (__DEV__) throw new Error(message);
    console.error(message);
    return '';
  }
  return value;
}

export const env = {
  supabaseUrl: required(extra.supabaseUrl, 'EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: required(extra.supabaseAnonKey, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  // Optional: only needed for Google Sign-In. Absent = the Google button hides.
  googleWebClientId: extra.googleWebClientId || undefined,
  googleIosClientId: extra.googleIosClientId || undefined,
  // Apple Sign-In is built but off until the Apple Developer setup is done.
  appleSignInEnabled: extra.appleSignInEnabled === true,
  analyticsEnabled: extra.analyticsEnabled === true,
  environment: (extra.environment ?? 'development') as 'development' | 'preview' | 'production',
  isProduction: extra.environment === 'production',
} as const;
