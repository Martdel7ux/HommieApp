import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { PAGE_SIZE } from '@/config/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { roommatesApi } from './api';
import { estimateCompatibility } from './compatibility';
import type { RoommateFilters, RoommateMatch } from './types';

/** Browse published roommate profiles, scored + sorted against the viewer. */
export function useRoommateBrowse(filters: RoommateFilters) {
  const { user, profile } = useAuth();

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

  const matches = useMemo<RoommateMatch[]>(() => {
    const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];
    const scored = rows.map((r) => ({ ...r, compatibility: estimateCompatibility(profile, r) }));
    if (filters.sort && filters.sort !== 'match') return scored;
    return scored.sort((a, b) => b.compatibility.score - a.compatibility.score);
  }, [query.data, profile, filters.sort]);

  const total = query.data?.pages[0]?.count ?? null;

  return { ...query, matches, total };
}

export function useHasRoommateProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qk.roommates('mine'), user?.id],
    queryFn: () => roommatesApi.hasPublishedProfile(user!.id),
    enabled: !!user,
  });
}
