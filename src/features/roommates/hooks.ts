import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { PAGE_SIZE } from '@/config/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { analytics } from '@/services/analytics';
import { haptics } from '@/services/haptics';
import { roommatesApi } from './api';
import { buildCompatInput, estimateCompatibility } from './compatibility';
import type { Compatibility, RoommateFilters, RoommateMatch, RoommateProfileDetail } from './types';

const PENDING: Compatibility = { score: 0, reasons: [], pending: true };

/** The viewer's own roommate preferences (published or not) — used for scoring. */
export function useMyRoommatePrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['roommate-prefs-mine', user?.id],
    queryFn: () => roommatesApi.getMine(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Browse published roommate profiles, scored + sorted against the viewer. */
export function useRoommateBrowse(filters: RoommateFilters) {
  const { user, profile } = useAuth();
  const myPrefs = useMyRoommatePrefs();

  const query = useInfiniteQuery({
    queryKey: qk.roommates(filters),
    initialPageParam: 0,
    enabled: !!user,
    queryFn: ({ pageParam }) =>
      roommatesApi.list(filters, {
        limit: PAGE_SIZE.roommates,
        offset: pageParam * PAGE_SIZE.roommates,
        excludeUserId: user?.id,
        withCount: pageParam === 0,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.rows.length, 0);
      const total = allPages[0]?.count ?? loaded;
      return loaded < total ? allPages.length : undefined;
    },
  });

  // Score only once the viewer's own data has settled, so the number doesn't
  // render low and then jump.
  const ready = !!profile && !myPrefs.isLoading;
  const input = useMemo(
    () => buildCompatInput(profile, myPrefs.data),
    [profile, myPrefs.data],
  );

  const matches = useMemo<RoommateMatch[]>(() => {
    const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];
    const scored = rows.map((r) => ({
      ...r,
      compatibility: ready ? estimateCompatibility(input, r) : PENDING,
    }));
    if (!ready || (filters.sort && filters.sort !== 'match')) return scored;
    return scored.sort((a, b) => b.compatibility.score - a.compatibility.score);
  }, [query.data, input, ready, filters.sort]);

  const total = query.data?.pages[0]?.count ?? null;

  return { ...query, matches, total };
}

export interface RoommateProfileWithMatch extends RoommateProfileDetail {
  compatibility: Compatibility;
}

/** A single published roommate profile, scored against the viewer. */
export function useRoommateProfile(userId: string) {
  const { user, profile } = useAuth();
  const myPrefs = useMyRoommatePrefs();
  const query = useQuery({
    queryKey: qk.roommate(userId),
    queryFn: () => roommatesApi.getDetail(userId, user!.id),
    enabled: !!user && !!userId,
  });

  const ready = !!profile && !myPrefs.isLoading;
  const input = useMemo(() => buildCompatInput(profile, myPrefs.data), [profile, myPrefs.data]);

  const data = useMemo<RoommateProfileWithMatch | null>(() => {
    if (!query.data) return null;
    return {
      ...query.data,
      compatibility: ready ? estimateCompatibility(input, query.data) : PENDING,
    };
  }, [query.data, input, ready]);

  return { ...query, data };
}

export function useSaveRoommate(userId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = qk.roommate(userId);

  return useMutation({
    mutationFn: (next: boolean) => roommatesApi.toggleSave(user!.id, userId, next),
    onMutate: async (next) => {
      haptics.select();
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<RoommateProfileDetail>(key);
      if (prev) queryClient.setQueryData<RoommateProfileDetail>(key, { ...prev, saved: next });
      if (next) analytics.track('roommate_saved', { profile_id: userId });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: qk.savedListings(`roommates:${user?.id ?? 'anon'}`) });
    },
  });
}

export function useHasRoommateProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qk.roommates('mine'), user?.id],
    queryFn: () => roommatesApi.hasPublishedProfile(user!.id),
    enabled: !!user,
  });
}
