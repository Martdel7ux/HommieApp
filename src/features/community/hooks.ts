import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { PAGE_SIZE } from '@/config/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { analytics } from '@/services/analytics';
import { communityApi } from './api';
import type { CommunityPost } from './types';
import type { CommunityCategory } from '@/types/database';

type Pages = InfiniteData<CommunityPost[], number>;

export function useCommunityFeed(category?: CommunityCategory) {
  const { user, status } = useAuth();

  const query = useInfiniteQuery({
    queryKey: qk.community(category),
    enabled: status === 'signed_in' && !!user,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      communityApi.listPosts(user!.id, {
        category,
        limit: PAGE_SIZE.community,
        offset: pageParam * PAGE_SIZE.community,
      }),
    getNextPageParam: (last, all) =>
      last.length < PAGE_SIZE.community ? undefined : all.length,
  });

  const posts = useMemo<CommunityPost[]>(() => query.data?.pages.flat() ?? [], [query.data]);
  return { ...query, posts };
}

export function usePostDetail(postId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.post(postId),
    enabled: !!user && !!postId,
    queryFn: () => communityApi.getPost(postId, user!.id),
  });
}

export function usePostComments(postId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['post', postId, 'comments'],
    enabled: !!user && !!postId,
    queryFn: () => communityApi.listComments(postId),
  });
}

/** Optimistic like toggle that patches every cached feed page + the detail. */
export function useLikePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, next }: { postId: string; next: boolean }) =>
      communityApi.toggleLike(user!.id, postId, next),
    onMutate: async ({ postId, next }) => {
      analytics.track('community_post_liked', { post_id: postId });
      const patch = (p: CommunityPost): CommunityPost =>
        p.id === postId
          ? { ...p, likedByMe: next, likesCount: Math.max(0, p.likesCount + (next ? 1 : -1)) }
          : p;

      queryClient.setQueriesData<Pages>({ queryKey: ['community'] }, (prev) =>
        prev ? { ...prev, pages: prev.pages.map((page) => page.map(patch)) } : prev,
      );
      queryClient.setQueryData<CommunityPost>(qk.post(postId), (prev) => (prev ? patch(prev) : prev));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
}

export function useCreatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { category: CommunityCategory; body: string; imagePaths?: string[] }) =>
      communityApi.createPost(user!.id, input),
    onSuccess: (_id, input) => {
      analytics.track('community_post_created', {
        category: input.category,
        has_image: (input.imagePaths?.length ?? 0) > 0,
      });
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
}

export function useAddComment(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => communityApi.addComment(user!.id, postId, body),
    onSuccess: () => {
      analytics.track('community_comment_created', { post_id: postId });
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: qk.post(postId) });
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
}
