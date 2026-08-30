import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { resolveImage, resolveAvatar } from '@/lib/images';
import { guard } from '@/services/errors';
import { PAGE_SIZE } from '@/config/constants';
import type { CommunityCategory } from '@/types/database';
import type { CommunityPost, PostComment } from './types';

const POST_SELECT = `
  id, category, body, image_paths, likes_count, comments_count, created_at,
  author:profiles!community_posts_author_id_fkey ( id, first_name, display_name, avatar_url )
`;

interface RawPost {
  id: string;
  category: CommunityCategory;
  body: string;
  image_paths: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: { id: string; first_name: string | null; display_name: string | null; avatar_url: string | null } | null;
}

function mapPost(r: RawPost, likedIds: Set<string>): CommunityPost {
  return {
    id: r.id,
    category: r.category,
    body: r.body,
    images: (r.image_paths ?? []).map((p) => resolveImage(p, STORAGE_BUCKETS.communityImages)!).filter(Boolean),
    likesCount: r.likes_count,
    commentsCount: r.comments_count,
    createdAt: r.created_at,
    author: r.author
      ? {
          id: r.author.id,
          name: r.author.first_name ?? r.author.display_name ?? 'Hommie user',
          avatarUrl: resolveAvatar(r.author.avatar_url) ?? null,
        }
      : null,
    likedByMe: likedIds.has(r.id),
  };
}

export const communityApi = {
  async listPosts(
    userId: string,
    opts: { category?: CommunityCategory; limit?: number; offset?: number } = {},
  ): Promise<CommunityPost[]> {
    return guard(async () => {
      let q = supabase
        .from('community_posts')
        .select(POST_SELECT)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });
      if (opts.category) q = q.eq('category', opts.category);

      const limit = opts.limit ?? PAGE_SIZE.community;
      const offset = opts.offset ?? 0;

      const { data, error } = await q.range(offset, offset + limit - 1).returns<RawPost[]>();
      if (error) throw error;
      const posts = data ?? [];

      // which of these did I like?
      const likedIds = new Set<string>();
      if (posts.length) {
        const { data: likes } = await supabase
          .from('community_post_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', posts.map((p) => p.id));
        (likes ?? []).forEach((l) => likedIds.add(l.post_id));
      }
      return posts.map((p) => mapPost(p, likedIds));
    }, { scope: 'community.listPosts' });
  },

  async getPost(postId: string, userId: string): Promise<CommunityPost> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select(POST_SELECT)
        .eq('id', postId)
        .single<RawPost>();
      if (error) throw error;
      const { data: like } = await supabase
        .from('community_post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .maybeSingle();
      return mapPost(data, new Set(like ? [like.post_id] : []));
    }, { scope: 'community.getPost' });
  },

  async toggleLike(userId: string, postId: string, nextLiked: boolean) {
    return guard(async () => {
      if (nextLiked) {
        const { error } = await supabase
          .from('community_post_likes')
          .insert({ post_id: postId, user_id: userId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
        if (error) throw error;
      }
    }, { scope: 'community.toggleLike' });
  },

  async createPost(userId: string, input: { category: CommunityCategory; body: string; imagePaths?: string[] }) {
    return guard(async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          author_id: userId,
          category: input.category,
          body: input.body.trim(),
          image_paths: input.imagePaths ?? [],
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    }, { scope: 'community.createPost' });
  },

  async listComments(postId: string): Promise<PostComment[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('community_comments')
        .select(
          `id, body, created_at,
           author:profiles!community_comments_author_id_fkey ( id, first_name, display_name, avatar_url )`,
        )
        .eq('post_id', postId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true })
        .returns<
          {
            id: string;
            body: string;
            created_at: string;
            author: {
              id: string;
              first_name: string | null;
              display_name: string | null;
              avatar_url: string | null;
            } | null;
          }[]
        >();
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.created_at,
        author: c.author
          ? {
              id: c.author.id,
              name: c.author.first_name ?? c.author.display_name ?? 'Hommie user',
              avatarUrl: resolveAvatar(c.author.avatar_url) ?? null,
            }
          : null,
      }));
    }, { scope: 'community.listComments' });
  },

  async addComment(userId: string, postId: string, body: string) {
    return guard(async () => {
      const { error } = await supabase
        .from('community_comments')
        .insert({ post_id: postId, author_id: userId, body: body.trim() });
      if (error) throw error;
    }, { scope: 'community.addComment' });
  },

  async reportPost(userId: string, postId: string, reason: string, details?: string) {
    return guard(async () => {
      const { error } = await supabase.from('reports').insert({
        reporter_id: userId,
        subject_type: 'community_post',
        subject_id: postId,
        reason: reason as never,
        details,
      });
      if (error && error.code !== '23505') throw error;
    }, { scope: 'community.reportPost' });
  },
};
