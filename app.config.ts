import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Hommie app config.
 *
 * Public runtime values are read from environment variables (see `.env.example`)
 * and exposed via `expo.extra`. Never place service-role keys or other secrets here —
 * anything in `extra` ships inside the app bundle.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hommie',
  slug: 'hommie',
  scheme: 'hommie',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.hommie.app',
    buildNumber: '1',
    usesAppleSignIn: true,
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'Hommie needs access to your photos so you can add pictures to listings, your profile and marketplace items.',
      NSCameraUsageDescription:
        'Hommie needs camera access so you can take photos for listings and your profile.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.hommie.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'],
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-asset',
    'expo-apple-authentication',
    [
      '@react-native-google-signin/google-signin',
      {
        // Reversed iOS OAuth client id (com.googleusercontent.apps.XXXX).
        // Set EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME before an `eas build`; the
        // placeholder only keeps `expo start` / config eval working without it.
        iosUrlScheme:
          process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ??
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
    analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
    environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
