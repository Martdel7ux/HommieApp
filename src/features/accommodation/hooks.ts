import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { guard } from '@/services/errors';
import { PAGE_SIZE } from '@/config/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { analytics } from '@/services/analytics';
import { haptics } from '@/services/haptics';
import { messagingApi } from '@/features/messaging/api';
import { accommodationApi } from './api';
import { landlordProfileApi } from './landlordProfileApi';
import type { AccommodationDetail, AccommodationFilters, AccommodationCard } from './types';

export function useListing(id: string) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: qk.listing(id),
    queryFn: () => accommodationApi.get(id, user!.id),
    enabled: !!user && !!id,
  });

  useEffect(() => {
    if (id) accommodationApi.recordView(id);
  }, [id]);

  return query;
}

export function useLandlordProfile(landlordId: string) {
  return useQuery({
    queryKey: qk.landlordProfile(landlordId),
    queryFn: () => landlordProfileApi.get(landlordId),
    enabled: !!landlordId,
  });
}

export function useSimilarListings(listing: AccommodationDetail | undefined) {
  return useQuery({
    queryKey: ['listings', 'similar', listing?.id],
    queryFn: () => accommodationApi.similar(listing!, 6),
    enabled: !!listing,
  });
}

interface EnquiryInput {
  landlordId: string;
  message: string;
  shareMoveIn: boolean;
  shareBudget: boolean;
  shareUniversity: boolean;
}

/** Send a first enquiry about a listing → conversation + enquiry row. Returns the conversation id. */
export function useSendEnquiry(listingId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EnquiryInput) =>
      guard(async () => {
        const conversationId = await messagingApi.startConversation(input.landlordId, {
          context: 'accommodation',
          accommodationListingId: listingId,
        });

        const body = input.message.trim();
        await messagingApi.sendMessage(conversationId, user!.id, body);

        const { error } = await supabase.from('enquiries').insert({
          listing_id: listingId,
          student_id: user!.id,
          landlord_id: input.landlordId,
          conversation_id: conversationId,
          message: body,
          share_move_in: input.shareMoveIn,
          share_budget: input.shareBudget,
          share_university: input.shareUniversity,
        });
        // a repeat enquiry (unique listing+student) is fine — reuse the conversation
        if (error && error.code !== '23505') throw error;

        return conversationId;
      }, { scope: 'accommodation.sendEnquiry' }),
    onSuccess: () => {
      analytics.track('enquiry_sent', { listing_id: listingId });
      queryClient.invalidateQueries({ queryKey: qk.conversations });
    },
  });
}

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
      haptics.select();
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
