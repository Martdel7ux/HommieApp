import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { PAGE_SIZE } from '@/config/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { analytics } from '@/services/analytics';
import { accommodationApi } from './api';
import type { AccommodationFilters, AccommodationCard } from './types';

export function useAccommodationSearch(filters: AccommodationFilters) {
  const query = useInfiniteQuery({
    queryKey: qk.listings(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      accommodationApi.list(filters, {
        limit: PAGE_SIZE.listings,
        offset: pageParam * PAGE_SIZE.listings,
        withCount: pageParam === 0,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.rows.length, 0);
      const total = allPages[0]?.count ?? loaded;
      return loaded < total ? allPages.length : undefined;
    },
  });

  const rows = useMemo<AccommodationCard[]>(
    () => query.data?.pages.flatMap((p) => p.rows) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.count ?? null;

  return { ...query, rows, total };
}

export function useSavedListings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = qk.savedListings(user?.id ?? 'anon');

  const toggle = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      accommodationApi.toggleSave(user!.id, id, next),
    onMutate: async ({ id, next }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(key, next ? [...prev, id] : prev.filter((x) => x !== id));
      analytics.track(next ? 'listing_saved' : 'listing_unsaved', { listing_id: id });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { toggle: (id: string, next: boolean) => toggle.mutate({ id, next }) };
}
