import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { env } from '@/config/env';

/**
 * Native social sign-in (Apple / Google) plumbing.
 *
 * The native modules (`expo-apple-authentication`,
 * `@react-native-google-signin/google-signin`) are pulled in with dynamic
 * `import()` so this file is safe to load in Expo Go, where they don't exist —
 * the buttons are simply hidden there (see `socialAuthSupported`). The real
 * flow needs a development / production build.
 */

/** Expo Go can't host the native auth modules — hide the buttons there. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Google needs a configured web client id; Apple is iOS-only and keyless. */
export const googleSignInConfigured = !isExpoGo && !!env.googleWebClientId;
/** Apple is built but stays hidden until EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED=true. */
export const appleSignInSupported = !isExpoGo && Platform.OS === 'ios' && env.appleSignInEnabled;
export const socialAuthSupported = googleSignInConfigured || appleSignInSupported;

export type SocialProvider = 'apple' | 'google';

/** Thrown when the user backs out of the provider sheet — never shown as an error. */
export class SocialCancelledError extends Error {
  constructor() {
    super('Social sign-in cancelled');
    this.name = 'SocialCancelledError';
  }
}

export interface SocialCredential {
  provider: SocialProvider;
  /** OIDC ID token handed to `supabase.auth.signInWithIdToken`. */
  idToken: string;
  /** Apple only, and only on the very first authorization for this Apple ID. */
  fullName?: { givenName?: string | null; familyName?: string | null } | null;
}

let googleConfigured = false;

async function loadGoogle() {
  const mod = await import('@react-native-google-signin/google-signin');
  if (!googleConfigured) {
    mod.GoogleSignin.configure({
      webClientId: env.googleWebClientId,
      iosClientId: env.googleIosClientId,
      scopes: ['email', 'profile'],
    });
    googleConfigured = true;
  }
  return mod;
}

export async function getAppleCredential(): Promise<SocialCredential> {
  const AppleAuthentication = await import('expo-apple-authentication');
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }
    return {
      provider: 'apple',
      idToken: credential.identityToken,
      fullName: credential.fullName
        ? {
            givenName: credential.fullName.givenName,
            familyName: credential.fullName.familyName,
          }
        : null,
    };
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'ERR_REQUEST_CANCELED'
    ) {
      throw new SocialCancelledError();
    }
    throw e;
  }
}

export async function getGoogleCredential(): Promise<SocialCredential> {
  const { GoogleSignin, statusCodes, isErrorWithCode } = await loadGoogle();
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const res = await GoogleSignin.signIn();
    if (res.type === 'cancelled') throw new SocialCancelledError();
    const idToken = res.data.idToken;
    if (!idToken) throw new Error('Google did not return an ID token.');
    return { provider: 'google', idToken };
  } catch (e) {
    if (e instanceof SocialCancelledError) throw e;
    if (
      isErrorWithCode(e) &&
      (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)
    ) {
      throw new SocialCancelledError();
    }
    throw e;
  }
}

/** Clear the cached Google session so the next sign-in shows the account picker. */
export async function signOutGoogle() {
  if (!googleConfigured) return;
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    /* nothing to clear */
  }
}
