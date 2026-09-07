import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { useAuth } from '@/features/auth/AuthProvider';
import { analytics } from '@/services/analytics';
import { messagingApi } from '@/features/messaging/api';
import type { ListingStatus } from '@/types/database';
import { landlordApi } from './api';
import type { LandlordEnquiry, ListingDraft } from './types';

export function useMyListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.landlordListings(user?.id ?? 'anon'),
    queryFn: () => landlordApi.myListings(user!.id),
    enabled: !!user,
  });
}

export function useLandlordListing(id: string) {
  return useQuery({
    queryKey: qk.landlordListing(id),
    queryFn: () => landlordApi.getListing(id),
    enabled: !!id,
  });
}

/** Invalidate everything a listing change can touch (landlord views + student search). */
function useInvalidateListings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: qk.landlordListings(user?.id ?? 'anon') });
    queryClient.invalidateQueries({ queryKey: qk.landlordDashboard });
    queryClient.invalidateQueries({ queryKey: ['listings'] });
    if (id) {
      queryClient.invalidateQueries({ queryKey: qk.landlordListing(id) });
      queryClient.invalidateQueries({ queryKey: qk.listing(id) });
    }
  };
}

export function useSaveListing(mode: 'create' | 'edit', listingId?: string) {
  const { user } = useAuth();
  const invalidate = useInvalidateListings();

  return useMutation({
    mutationFn: async ({ draft, publish }: { draft: ListingDraft; publish: boolean }) => {
      if (mode === 'create') {
        return landlordApi.createListing(user!.id, draft, { publish });
      }
      await landlordApi.updateListing(listingId!, user!.id, draft, { publish });
      return listingId!;
    },
    onSuccess: (id, { publish }) => {
      if (publish) analytics.track('landlord_listing_published', { listing_id: id });
      invalidate(id);
    },
  });
}

export function useListingStatus() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ListingStatus }) =>
      landlordApi.setStatus(id, status),
    onSuccess: (_r, { id, status }) => {
      analytics.track('landlord_listing_status_changed', { listing_id: id, status });
      invalidate(id);
    },
  });
}

export function useDuplicateListing() {
  const { user } = useAuth();
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: (id: string) => landlordApi.duplicateListing(id, user!.id),
    onSuccess: (newId, srcId) => {
      analytics.track('landlord_listing_duplicated', { listing_id: srcId });
      invalidate(newId);
    },
  });
}

export function useDeleteListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: (id: string) => landlordApi.deleteListing(id),
    onSuccess: () => invalidate(),
  });
}

export function useMyEnquiries(listingId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qk.enquiries, listingId ?? 'all'],
    queryFn: () => landlordApi.myEnquiries(user!.id, listingId),
    enabled: !!user,
  });
}

export function useOpenEnquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enquiry: LandlordEnquiry): Promise<string> => {
      if (!enquiry.is_read) await landlordApi.markEnquiryRead(enquiry.id);
      analytics.track('landlord_enquiry_opened', { enquiry_id: enquiry.id });
      if (enquiry.conversation_id) return enquiry.conversation_id;
      return messagingApi.startConversation(enquiry.student_id, {
        context: 'accommodation',
        accommodationListingId: enquiry.listing_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.enquiries });
      queryClient.invalidateQueries({ queryKey: qk.landlordDashboard });
      queryClient.invalidateQueries({ queryKey: qk.conversations });
    },
  });
}
