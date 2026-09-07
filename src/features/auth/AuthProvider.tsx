import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { analytics } from '@/services/analytics';
import { logger } from '@/services/logger';
import type { Tables, UserRole } from '@/types/database';

export type Profile = Tables<'profiles'>;
export type LandlordProfile = Tables<'landlord_profiles'>;

type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: Session['user'] | null;
  profile: Profile | null;
  landlordProfile: LandlordProfile | null;
  role: UserRole | null;
  isEmailVerified: boolean;
  needsOnboarding: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [landlordProfile, setLandlordProfile] = useState<LandlordProfile | null>(null);
  const loadingProfileFor = useRef<string | null>(null);
  // Monotonic guard: a slower in-flight load must never overwrite a newer one
  // (e.g. the onAuthStateChange load racing a post-`apply_selected_role` refresh
  // during a social landlord sign-up).
  const loadSeq = useRef(0);

  const loadProfile = useCallback(async (userId: string) => {
    if (loadingProfileFor.current === userId) return;
    loadingProfileFor.current = userId;
    const seq = ++loadSeq.current;
    try {
      const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      let lp: LandlordProfile | null = null;
      if (p?.role === 'landlord') {
        ({ data: lp } = await supabase.from('landlord_profiles').select('*').eq('id', userId).maybeSingle());
      }
      if (seq !== loadSeq.current) return; // a newer load has superseded this one
      setProfile(p);
      setLandlordProfile(lp);
      if (p) {
        analytics.identify(userId, { role: p.role, onboarding_completed: p.onboarding_completed });
        analytics.register({ role: p.role });
      }
    } catch (e) {
      logger.capture(e, { scope: 'auth.loadProfile' });
    } finally {
      loadingProfileFor.current = null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => active && setStatus('signed_in'));
      } else {
        setStatus('signed_out');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (event === 'SIGNED_OUT' || !newSession) {
        setProfile(null);
        setLandlordProfile(null);
        setStatus('signed_out');
        queryClient.clear();
        return;
      }
      if (newSession.user) {
        loadProfile(newSession.user.id).finally(() => active && setStatus('signed_in'));
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, queryClient]);

  const refreshProfile = useCallback(async () => {
    // Read the session straight from the client so this works even when React
    // state hasn't caught up yet (e.g. right after a social sign-in resolves).
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (uid) {
      loadingProfileFor.current = null;
      await loadProfile(uid);
    }
  }, [loadProfile]);

  const value = useMemo<AuthState>(() => {
    const user = session?.user ?? null;
    const role = (profile?.role ?? (user?.user_metadata?.role as UserRole | undefined) ?? null) as UserRole | null;
    const isEmailVerified = !!user?.email_confirmed_at || !!user?.confirmed_at;
    return {
      status,
      session,
      user,
      profile,
      landlordProfile,
      role,
      isEmailVerified,
      needsOnboarding: status === 'signed_in' && !!profile && !profile.onboarding_completed,
      refreshProfile,
    };
  }, [status, session, profile, landlordProfile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function useRequireRole(role: UserRole): boolean {
  const { role: current } = useAuth();
  return current === role;
}
