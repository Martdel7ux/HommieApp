import React, { useEffect } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './AuthProvider';
import { LoadingState } from '@/components/ui';

/**
 * Central navigation guard.
 *
 * Routing rules:
 *  - not signed in            -> (auth)/browse (guest landing — real listings,
 *    no account required; App Review Guideline 5.1.1(v))
 *  - signed in, email unverified -> (auth)/verify-email
 *  - signed in, onboarding incomplete -> onboarding/<role>
 *  - signed in student        -> (student) group
 *  - signed in landlord       -> (landlord) group
 *
 * Role enforcement here is UX only — Supabase RLS is the real boundary.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, role, isEmailVerified, needsOnboarding, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    SplashScreen.hideAsync().catch(() => undefined);

    const group = segments[0];
    const inAuth = group === '(auth)';
    const inOnboarding = group === 'onboarding';
    // Screens reachable from anywhere, signed in or not:
    //  - legal: the Terms/Privacy link on the sign-up form.
    //  - accommodation: guest browsing/search, required by App Review
    //    Guideline 5.1.1(v) — browsing listings isn't account-based, so it
    //    can't be gated behind sign-up. Account-based actions inside those
    //    screens (save, enquire, message) prompt sign-in at the point of
    //    use instead (see app/accommodation/index.tsx and [id].tsx).
    const isPublic = group === 'legal' || group === 'accommodation';
    if (isPublic) return;

    if (status === 'signed_out') {
      if (!inAuth) router.replace('/(auth)/browse');
      return;
    }

    // signed in
    if (session && !isEmailVerified) {
      if (segments.join('/') !== '(auth)/verify-email') router.replace('/(auth)/verify-email');
      return;
    }

    if (needsOnboarding) {
      if (!inOnboarding) router.replace(role === 'landlord' ? '/onboarding/landlord' : '/onboarding/student');
      return;
    }

    // fully onboarded — keep out of auth/onboarding
    if (inAuth || inOnboarding || group === undefined) {
      router.replace(role === 'landlord' ? '/(landlord)/dashboard' : '/(student)/home');
    }
  }, [status, role, isEmailVerified, needsOnboarding, session, segments, router]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1 }}>
        <LoadingState />
      </View>
    );
  }

  return <>{children}</>;
}
