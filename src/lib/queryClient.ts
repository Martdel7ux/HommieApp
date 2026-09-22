import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storage';
import { toAppError } from '@/services/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        const code = toAppError(error).code;
        if (code === '42501' || code === 'network') return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: STORAGE_KEYS.querycache,
  throttleTime: 2_000,
});

/** Central query keys — keep all cache keys here to avoid typos + stale caches. */
export const qk = {
  session: ['session'] as const,
  profile: (id: string) => ['profile', id] as const,
  universities: ['universities'] as const,
  listings: (filters?: unknown) => ['listings', filters] as const,
  listing: (id: string) => ['listing', id] as const,
  savedListings: (userId: string) => ['saved-listings', userId] as const,
  roommates: (filters?: unknown) => ['roommates', filters] as const,
  roommate: (id: string) => ['roommate', id] as const,
  community: (category?: string) => ['community', category] as const,
  post: (id: string) => ['post', id] as const,
  events: ['events'] as const,
  event: (id: string) => ['event', id] as const,
  marketplace: (filters?: unknown) => ['marketplace', filters] as const,
  marketplaceItem: (id: string) => ['marketplace-item', id] as const,
  jobs: (filters?: unknown) => ['jobs', filters] as const,
  job: (id: string) => ['job', id] as const,
  savedJobs: (userId: string) => ['saved-jobs', userId] as const,
  conversations: ['conversations'] as const,
  unreadConversations: ['conversations', 'unread-count'] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  blockedUsers: (userId: string) => ['blocked-users', userId] as const,
  enquiries: ['enquiries'] as const,
  notifications: ['notifications'] as const,
  unreadNotifications: ['notifications', 'unread-count'] as const,
  landlordDashboard: ['landlord-dashboard'] as const,
  landlordListings: (userId: string) => ['landlord-listings', userId] as const,
  landlordListing: (id: string) => ['landlord-listing', id] as const,
  landlordProfile: (id: string) => ['landlord-profile', id] as const,
};
