import { existsSync } from 'node:fs';
import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Hommie app config.
 *
 * Public runtime values are read from environment variables (see `.env.example`)
 * and exposed via `expo.extra`. Never place service-role keys or other secrets here —
 * anything in `extra` ships inside the app bundle.
 */
// Apple Sign-In is built but the native entitlement / plugin only go in once
// the Apple Developer setup is done. Flip this on then.
const appleSignInEnabled = process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED === 'true';

// Android push (FCM). Drop the file Firebase gives you at the repo root; the
// config picks it up automatically. Without it, Android builds still work —
// they just can't receive push. See docs/PUSH_NOTIFICATIONS_SETUP.md.
// EAS builds recreate it from the GOOGLE_SERVICES_JSON_B64 secret via the
// eas-build-pre-install hook (scripts/write-google-services.js).
const googleServicesFile = existsSync('./google-services.json')
  ? './google-services.json'
  : undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hommie',
  slug: 'hommie',
  owner: 'marttindelas-team',
  scheme: 'hommie',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.hommie.app',
    buildNumber: '15',
    ...(appleSignInEnabled ? { usesAppleSignIn: true } : {}),
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'Hommie needs access to your photos so you can add pictures to listings, your profile and marketplace items.',
      NSCameraUsageDescription:
        'Hommie needs camera access so you can take photos for listings and your profile.',
      NSCalendarsUsageDescription:
        'Hommie can add events you RSVP to on your calendar.',
      NSCalendarsWriteOnlyAccessUsageDescription:
        'Hommie can add events you RSVP to on your calendar.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.hommie.app',
    versionCode: 1,
    ...(googleServicesFile ? { googleServicesFile } : {}),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    permissions: ['CAMERA'],
    // Libraries add these by default; the app doesn't use them (image picking
    // and calendar insert go through system UI), and Play scrutinises them.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    './plugins/withGradleMemory',
    'expo-secure-store',
    'expo-font',
    'expo-asset',
    '@react-native-community/datetimepicker',
    ...(appleSignInEnabled ? ['expo-apple-authentication'] : []),
    [
      '@sentry/react-native/expo',
      {
        // Auth token comes from the SENTRY_AUTH_TOKEN EAS secret at build
        // time, never here (it's a secret; see src/services/sentry.ts).
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      {
        // Reversed iOS OAuth client id (com.googleusercontent.apps.XXXX).
        // Set EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME before `npx expo run:ios`; the
        // placeholder only keeps config eval working without it.
        iosUrlScheme:
          process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ||
          'com.googleusercontent.apps.placeholder-not-configured',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Hommie needs access to your photos so you can add pictures to listings, your profile and marketplace items.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#4F46E5',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    appleSignInEnabled,
    analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
    posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    // Optional: crash reporting stays off until this is set (see src/services/sentry.ts).
    // The native source-map-upload config plugin isn't added yet — see that file's header.
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
    eas: {
      // EAS-CLI statically scans this file for a literal id and can't
      // auto-write it back (dynamic config) — keep it hardcoded, override
      // via env only if the project ever changes.
      projectId: process.env.EAS_PROJECT_ID ?? 'a22dd431-4d03-4155-967e-66d56b42bff3',
    },
  },
});
