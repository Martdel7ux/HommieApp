import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { PAGE_SIZE } from '@/config/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { analytics } from '@/services/analytics';
import { marketplaceApi, type NewListingInput } from './api';
import type { MarketplaceCard, MarketplaceFilters } from './types';

export function useMarketplace(filters: MarketplaceFilters) {
  const query = useInfiniteQuery({
    queryKey: qk.marketplace(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      marketplaceApi.list(filters, {
        limit: PAGE_SIZE.marketplace,
        offset: pageParam * PAGE_SIZE.marketplace,
        withCount: pageParam === 0,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.rows.length, 0);
      const total = allPages[0]?.count ?? loaded;
      return loaded < total ? allPages.length : undefined;
    },
  });

  const rows = useMemo<MarketplaceCard[]>(
    () => query.data?.pages.flatMap((p) => p.rows) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.count ?? null;

  return { ...query, rows, total };
}

export function useCreateListing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewListingInput) => marketplaceApi.create(user!.id, input),
    onSuccess: (_id, input) => {
      analytics.track('marketplace_listing_created', { category: input.category });
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
}

export function useMarketplaceItem(id: string) {
  return useQuery({
    queryKey: qk.marketplaceItem(id),
    queryFn: () => marketplaceApi.get(id),
    enabled: !!id,
  });
}

export function useSavedMarketplace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = qk.savedListings(`mkt:${user?.id ?? 'anon'}`);

  const saved = useQuery({
    queryKey: key,
    queryFn: () => marketplaceApi.savedIds(user!.id),
    enabled: !!user,
  });

  const toggle = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      marketplaceApi.toggleSave(user!.id, id, next),
    onMutate: async ({ id, next }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(key, next ? [...prev, id] : prev.filter((x) => x !== id));
      if (next) analytics.track('marketplace_item_saved', { item_id: id });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    savedIds: saved.data ?? [],
    toggle: (id: string, next: boolean) => toggle.mutate({ id, next }),
  };
}
